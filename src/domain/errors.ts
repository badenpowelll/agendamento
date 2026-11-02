/** Erro de regra de negócio, com mensagem pronta para mostrar à usuária. */
export class DomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
export class SlotUnavailableError extends DomainError {
  constructor() {
    super("SLOT_UNAVAILABLE", "Este horário acabou de ser reservado ou não está mais disponível. Escolha outro horário.");
  }
}
