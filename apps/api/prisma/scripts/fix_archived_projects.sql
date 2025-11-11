-- Corrige projetos antigos sem flag de arquivamento
UPDATE "Project"
SET "archived" = FALSE
WHERE "archived" IS NULL;
