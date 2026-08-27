-- 0012_afgeleverd.sql — afleverbevestiging voor de inbox (module W).
--
-- Drie zichtbare stappen bij op-naam-vragen, zoals een berichtenapp:
-- afgeleverd (het toestel heeft het item opgehaald) → gezien (geopend) →
-- beantwoord. Registratie gebeurt voor elk item (uitnodigingsdienst-kant);
-- TONEN gebeurt uitsluitend bij op-naam-bevragingen (W12) — bij
-- teambevragingen ziet niemand ooit wie iets ontving, opende of invulde.

begin;

alter table core.bevraging_uitnodiging
  add column afgeleverd_op timestamptz;

commit;
