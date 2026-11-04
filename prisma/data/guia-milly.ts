/**
 * Dados reais do "Guia de Atendimento – Milly Rodrigues" (PDF enviado pelo Baden em 04/11/2026).
 * Tudo aqui foi transcrito do guia; nada inventado. Aplicado uma única vez por versão (ver seed.ts).
 * Depois de aplicado, a gestora edita tudo pelo painel.
 */
export const GUIDE_VERSION = "guia-2026-11-04";

export const guideSite = {
  tagline: "Faça de si mesma uma prioridade!",
  aboutTitle: "Este é o nosso espaço",
  aboutText: [
    "Aqui você será atendida com todo o cuidado que merece! Para uma experiência mais acolhedora, durante os atendimentos servimos um café especial no espaço.",
    "Trabalho com o método hidrossolúvel, uma técnica moderna e delicada que utiliza uma cera natural à base de água. Ela é mais suave para a pele, reduz a dor e evita irritações, sendo perfeita para todos os tipos de pele, inclusive gestantes.",
    "Além de eficiente, proporciona uma depilação mais higiênica, confortável e com resultado de pele lisinha por muito mais tempo.",
  ].join("\n\n"),
  address: "Av. Dr. João Medeiros Filho, 3939, em frente ao Tentação Lanche",
  mapsUrl: "https://maps.app.goo.gl/U7TfFjkmcFzgM4yt6", // link "Clique aqui para ver o trajeto!" do guia
  payment: {
    pixKey: "+5584999627357",
    pixName: "Clubfit",
    depositPercent: 30,
    depositHours: 24,
    methods: "Pix, cartão de débito ou crédito/link (pagamentos no cartão têm acréscimo da maquineta)",
    note: "",
  },
  cancellation: [
    "Atraso: tolerância de até 10 minutos.",
    "O agendamento só é finalizado mediante o pagamento do sinal de 30% do valor do procedimento, em até 24h. O pagamento pode ser feito via Pix ou cartão de débito ou crédito/link (no crédito tem o acréscimo da maquineta).",
    "O sinal só é devolvido em caso de desistência com 48h de antecedência ou caso a profissional não compareça.",
    "Em desmarques em cima da hora ou falta, o valor não é estornado e, para remarcar, é preciso um novo sinal. Só agende se tiver certeza de que irá comparecer.",
  ].join("\n\n"),
  faq: [
    {
      q: "Como funciona a cera hidrossolúvel?",
      a: "É uma cera natural à base de água. É mais suave para a pele, reduz a dor e evita irritações, serve para todos os tipos de pele (inclusive gestantes), é mais higiênica e deixa a pele lisinha por muito mais tempo.",
    },
    {
      q: "Quais são os tipos de depilação íntima?",
      a: "Simples: remoção dos pelos da virilha e parte dos grandes lábios, removendo os pelos que ficam para fora do biquíni.\nCavada: remoção dos pelos da virilha e parte dos grandes lábios, interno e externo, deixando somente uma linha no monte de Vênus; a remoção dos pelos do ânus é opcional.\nTotal: remoção total dos pelos; o ânus é opcional.",
    },
    {
      q: "O que está incluído na virilha completa?",
      a: "Inclui ânus (opcional), com pós personalizado e LED terapia. Caso passe a lâmina entre uma sessão e outra, há uma taxa de R$ 5,00.",
    },
    {
      q: "Como garanto meu horário?",
      a: "O agendamento só é finalizado com o pagamento do sinal de 30% do valor do procedimento, em até 24h. Chave Pix: +5584999627357 (nome: Clubfit). Também aceitamos cartão de débito e crédito/link (no crédito tem o acréscimo da maquineta). Seu horário será confirmado somente após o pagamento do sinal.",
    },
    {
      q: "E se eu precisar desmarcar ou me atrasar?",
      a: "A tolerância de atraso é de até 10 minutos. O sinal só é devolvido em caso de desistência com 48h de antecedência ou caso a profissional não compareça. Em desmarques em cima da hora ou falta, o valor não é estornado e, para remarcar, é preciso um novo sinal.",
    },
    {
      q: "Cuidados antes da depilação",
      a: [
        "Vindo de lâmina: os pelos precisam ter pelo menos 15 dias de crescimento, exceto axilas e buço, que podem ser feitos com 10 dias.",
        "Vindo de cera: respeite o intervalo mínimo de 20 dias entre uma depilação e outra.",
        "Evite sol por no mínimo 72 horas antes; se precisar se expor, use protetor solar.",
        "Não faça bronzeamento artificial ou natural nos 5 dias anteriores. A pele precisa estar saudável e sem descamações.",
        "Use roupas confortáveis no dia. Evite jeans e peças apertadas, principalmente na depilação íntima. Traga uma calcinha reserva, caso necessário.",
        "Informe sempre se usa ácidos, medicamentos ou se está gestante.",
        "Cuide da pele diariamente: hidratação, bastante água e esfoliação 1x por semana.",
        "Faça a esfoliação 3 dias antes. Isso remove células mortas e evita encravados, mas não deve ser feita muito perto do atendimento.",
        "Venha com a pele limpa: sem cremes, loções, desodorante ou maquiagem no dia, nem nenhum produto na região que será depilada.",
        "Se possível, tome um banho quente no dia: ajuda bastante em relação à dor.",
      ].join("\n"),
    },
    {
      q: "Cuidados depois da depilação",
      a: [
        "Não se exponha ao sol por no mínimo 5 dias; em caso de exposição, use protetor solar.",
        "Bronzeamento artificial e sol: apenas 7 dias depois. Manchas, queimaduras ou lesões podem acontecer se esse tempo não for respeitado.",
        "Evite roupas apertadas e jeans no dia: prefira roupas leves e confortáveis.",
        "Prefira sabonete líquido, de preferência neutro (o de barra acumula mais bactérias).",
        "Não pratique exercícios no dia: atrito e suor podem causar irritações.",
        "Evite banho quente e use uma toalha limpa.",
        "Aguarde cerca de 2 horas para tomar banho: foram aplicados produtos de alta qualidade.",
        "Evite maquiagem, perfume, desodorante, cremes e qualquer produto com álcool na área depilada.",
        "Depilação íntima: relações sexuais apenas após 24 horas.",
      ].join("\n"),
    },
  ],
};

type GuideService = { category: string; name: string; price: number; description?: string };

/** Todos os serviços do guia, na ordem em que aparecem. Duração: ainda não informada (ver seed). */
export const guideServices: GuideService[] = [
  { category: "Depilação", name: "Buço", price: 20 },
  { category: "Depilação", name: "Queixo", price: 20 },
  { category: "Depilação", name: "Rosto completo", price: 45 },
  { category: "Depilação", name: "Axila", price: 30 },
  { category: "Depilação", name: "Virilha simples", price: 55 },
  { category: "Depilação", name: "Virilha cavada", price: 65 },
  { category: "Depilação", name: "Virilha completa", price: 75, description: "Incluindo ânus (opcional), com pós personalizado + LED terapia. Caso passe a lâmina entre uma sessão e outra, taxa de R$ 5,00." },
  { category: "Depilação", name: "Meia perna", price: 45 },
  { category: "Depilação", name: "Perna completa", price: 70 },
  { category: "Depilação", name: "Braços", price: 40 },
  { category: "Depilação", name: "Abdômen", price: 40 },
  { category: "Depilação", name: "Linha alba", price: 20 },
  { category: "Depilação", name: "Glúteo", price: 40 },
  { category: "Clareamento & Spa", name: "Virilha completa + Clareamento + Blend clareador", price: 150 },
  { category: "Clareamento & Spa", name: "Clareamento de axila + Blend", price: 55 },
  { category: "Clareamento & Spa", name: "Virilha + FPE", price: 90 },
  { category: "Clareamento & Spa", name: "FPE (sessão)", price: 45 },
  { category: "Clareamento & Spa", name: "Tratamento FPE + Blend", price: 60 },
  { category: "Clareamento & Spa", name: "Clareamento + Blend clareador (sessão)", price: 75 },
  { category: "Clareamento & Spa", name: "Clareamento (sessão, sem blend)", price: 50 },
  { category: "Clareamento & Spa", name: "Spa íntimo", price: 50 },
  { category: "Banho de lua", name: "Banho de lua: braços", price: 20 },
  { category: "Banho de lua", name: "Banho de lua: pernas", price: 35 },
  { category: "Banho de lua", name: "Banho de lua: meia perna", price: 20 },
  { category: "Banho de lua", name: "Banho de lua: barriga", price: 20 },
  { category: "Banho de lua", name: "Banho de lua: costas", price: 20 },
  { category: "Combos", name: "Combo buço, axila e virilha completa", price: 120, description: "Valor individual: R$ 125,00" },
  { category: "Combos", name: "Combo axila, virilha completa e meia perna", price: 150, description: "Valor individual: R$ 155,00" },
  { category: "Combos", name: "Combo axila, virilha completa e perna completa", price: 170, description: "Valor individual: R$ 175,00" },
  { category: "Combos", name: "Combo axila, virilha completa, perna completa e nádegas", price: 210, description: "Valor individual: R$ 215,00" },
  { category: "Combos", name: "Combo virilha completa, perna completa, nádegas e abdômen", price: 220, description: "Valor individual: R$ 225,00" },
];
