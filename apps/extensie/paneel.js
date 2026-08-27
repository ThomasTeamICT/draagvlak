/**
 * Draagvlak zijpaneel — de inbox en het antwoordformulier.
 *
 * "Wie ziet dit" is een eerste-klas-scherm (W6): elk item toont vóór het
 * openen wie het antwoord te zien krijgt; het typeverschil (op naam vs.
 * vertrouwelijk) draagt kleur én tekst. "Liever niet zeggen" is een geteld
 * antwoord; overslaan kan altijd door een vraag leeg te laten.
 */
import { apiVraag, synchroniseer } from './gedeeld.js'

const inhoud = document.getElementById('inhoud')
const synctijd = document.getElementById('synctijd')
document.getElementById('ververs').addEventListener('click', () => void toonInbox(true))
document.getElementById('instellingen').addEventListener('click', () => chrome.runtime.openOptionsPage())

const SOORTNAAM = { op_naam: 'op naam', team: 'vertrouwelijk' }

async function toonInbox(vernieuw = false) {
  inhoud.replaceChildren(stil('Inbox laden…'))
  const uitkomst = vernieuw
    ? await synchroniseer()
    : (await chrome.storage.local.get('inbox')).inbox !== undefined
      ? { items: (await chrome.storage.local.get('inbox')).inbox }
      : await synchroniseer()

  if (uitkomst.fout) {
    const nietKlaar = uitkomst.fout.includes('aangemeld') || uitkomst.fout.includes('endpoint')
    inhoud.replaceChildren(
      melding(
        nietKlaar
          ? 'Je bent nog niet aangemeld. Open de instellingen om je aan te melden — daarna verschijnt je inbox hier.'
          : `Synchroniseren lukte niet: ${uitkomst.fout}`,
        !nietKlaar,
      ),
    )
    if (nietKlaar) {
      const knop = document.createElement('button')
      knop.className = 'verstuur'
      knop.textContent = 'Instellingen openen'
      knop.addEventListener('click', () => chrome.runtime.openOptionsPage())
      inhoud.append(knop)
    }
    toonSynctijd()
    return
  }

  const items = uitkomst.items ?? []
  if (items.length === 0) {
    inhoud.replaceChildren(stil('Niets openstaand. 👌'))
    toonSynctijd()
    return
  }
  const sjabloon = document.getElementById('sjabloon-item')
  inhoud.replaceChildren(
    ...items.map((item) => {
      const el = sjabloon.content.firstElementChild.cloneNode(true)
      const soort = el.querySelector('.soort')
      soort.textContent = SOORTNAAM[item.type] ?? item.type
      soort.classList.add(item.type)
      el.querySelector('.titel').textContent = item.titel
      const toel = el.querySelector('.toelichting')
      if (item.toelichting) toel.textContent = item.toelichting
      else toel.remove()
      el.querySelector('.wieziet').textContent = item.wieZietDit
      el.addEventListener('click', () => void toonFormulier(item))
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void toonFormulier(item) }
      })
      return el
    }),
  )
  toonSynctijd()
}

async function toonFormulier(item) {
  inhoud.replaceChildren(stil('Vragen laden…'))
  let detail
  try {
    detail = await apiVraag(`/api/v1/inbox/${item.uitnodiging_id}`)
  } catch (fout) {
    inhoud.replaceChildren(melding(`Openen lukte niet: ${fout.message}`, true))
    return
  }

  const terug = document.createElement('button')
  terug.className = 'terug'
  terug.textContent = '← terug naar de inbox'
  terug.addEventListener('click', () => void toonInbox())

  const kop = document.createElement('div')
  kop.className = 'vraagblok'
  kop.innerHTML = `<h3></h3><p class="wieziet"></p>`
  kop.querySelector('h3').textContent = item.titel
  kop.querySelector('.wieziet').textContent = item.wieZietDit

  const formulier = document.createElement('form')
  formulier.style.display = 'contents'
  const invoerVelden = []

  for (const vraag of detail.vragen) {
    const blok = document.createElement('section')
    blok.className = 'vraagblok'
    const titel = document.createElement('h3')
    titel.textContent = `${vraag.volgnr}. ${vraag.tekst}`
    blok.append(titel)
    const veld = maakVeld(vraag)
    blok.append(veld.element)

    const lieverNiet = document.createElement('label')
    lieverNiet.className = 'lievernietrij'
    const vink = document.createElement('input')
    vink.type = 'checkbox'
    lieverNiet.append(vink, document.createTextNode('liever niet zeggen (telt mee als antwoord)'))
    vink.addEventListener('change', () => veld.zetActief(!vink.checked))
    blok.append(lieverNiet)

    invoerVelden.push({ vraag, veld, lieverNiet: vink })
    formulier.append(blok)
  }

  const verstuur = document.createElement('button')
  verstuur.type = 'submit'
  verstuur.className = 'verstuur'
  verstuur.textContent = 'Versturen'
  formulier.append(verstuur)

  formulier.addEventListener('submit', async (e) => {
    e.preventDefault()
    const antwoorden = []
    for (const { vraag, veld, lieverNiet } of invoerVelden) {
      if (lieverNiet.checked) { antwoorden.push({ vraagId: vraag.id, lieverNiet: true }); continue }
      const waarde = veld.waarde()
      if (waarde !== undefined) antwoorden.push({ vraagId: vraag.id, waarde })
      // leeg gelaten = overgeslagen, en dat mag
    }
    if (antwoorden.length === 0) {
      inhoud.prepend(melding('Je hebt niets ingevuld. Vul minstens één vraag in, of kies "liever niet zeggen".', true))
      return
    }
    verstuur.disabled = true
    verstuur.textContent = 'Versturen…'
    try {
      await apiVraag(`/api/v1/inbox/${item.uitnodiging_id}/antwoorden`, {
        method: 'POST',
        body: JSON.stringify({ antwoorden }),
      })
      await synchroniseer()
      inhoud.replaceChildren(stil('Verstuurd. Dank je wel! ✅'))
      setTimeout(() => void toonInbox(), 900)
    } catch (fout) {
      verstuur.disabled = false
      verstuur.textContent = 'Versturen'
      inhoud.prepend(melding(`Versturen lukte niet: ${fout.message}`, true))
    }
  })

  inhoud.replaceChildren(terug, kop, formulier)
}

/** Eén invoerveld per vraagvorm; geeft {element, waarde(), zetActief()}. */
function maakVeld(vraag) {
  const naam = `v${vraag.volgnr}`
  const maakKeuzes = (opties, type, rij = false) => {
    const houder = document.createElement('div')
    houder.className = 'keuzes' + (rij ? ' rij schaal' : '')
    for (const optie of opties) {
      const label = document.createElement('label')
      const invoer = document.createElement('input')
      invoer.type = type
      invoer.name = naam
      invoer.value = JSON.stringify(optie)
      label.append(invoer, document.createTextNode(String(optie)))
      houder.append(label)
    }
    return houder
  }
  let element, waarde
  if (vraag.vorm === 'ja_nee') {
    element = maakKeuzes(['ja', 'nee'], 'radio')
    waarde = () => {
      const g = element.querySelector('input:checked')
      return g ? g.value === '"ja"' : undefined
    }
  } else if (vraag.vorm === 'keuze' || vraag.vorm === 'datumkeuze') {
    element = maakKeuzes(vraag.opties ?? [], 'radio')
    waarde = () => {
      const g = element.querySelector('input:checked')
      return g ? JSON.parse(g.value) : undefined
    }
  } else if (vraag.vorm === 'meerkeuze') {
    element = maakKeuzes(vraag.opties ?? [], 'checkbox')
    waarde = () => {
      const g = [...element.querySelectorAll('input:checked')].map((i) => JSON.parse(i.value))
      return g.length > 0 ? g : undefined
    }
  } else if (vraag.vorm === 'schaal') {
    const { min = 1, max = 5 } = vraag.opties ?? {}
    const reeks = []
    for (let i = min; i <= max; i++) reeks.push(i)
    element = maakKeuzes(reeks, 'radio', true)
    waarde = () => {
      const g = element.querySelector('input:checked')
      return g ? JSON.parse(g.value) : undefined
    }
  } else {
    element = document.createElement('textarea')
    element.placeholder = 'Typ je antwoord…'
    waarde = () => (element.value.trim() === '' ? undefined : element.value.trim())
  }
  const zetActief = (actief) => {
    for (const invoer of element.matches('textarea') ? [element] : element.querySelectorAll('input'))
      invoer.disabled = !actief
  }
  return { element, waarde, zetActief }
}

function stil(tekst) {
  const p = document.createElement('p')
  p.className = 'stil'
  p.textContent = tekst
  return p
}
function melding(tekst, isFout) {
  const p = document.createElement('p')
  p.className = 'melding' + (isFout ? ' fout' : '')
  p.textContent = tekst
  return p
}
async function toonSynctijd() {
  const { laatsteSync } = await chrome.storage.local.get('laatsteSync')
  if (laatsteSync) {
    synctijd.textContent = `laatst bijgewerkt ${new Date(laatsteSync).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`
  }
}

void toonInbox()
