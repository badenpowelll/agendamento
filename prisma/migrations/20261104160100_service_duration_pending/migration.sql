-- Serviço com duração 0 = "duração a definir": aparece na tabela de preços, mas não é agendável online.
ALTER TABLE "Service" DROP CONSTRAINT service_positive_duration;
ALTER TABLE "Service" ADD CONSTRAINT service_positive_duration CHECK ("durationMin" >= 0 AND "bufferMin" >= 0);
