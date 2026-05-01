export type CheckoutLanguage = "pt" | "en" | "es" | "AUTO";

type TranslationKeys = {
  emailLabel: string;
  emailPlaceholder: string;
  confirmEmailLabel: string;
  confirmEmailPlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  surnameLabel: string;
  surnamePlaceholder: string;
  cpfLabel: string;
  cpfPlaceholder: string;
  cnpjLabel: string;
  cnpjPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  zipLabel: string;
  zipPlaceholder: string;
  streetLabel: string;
  streetPlaceholder: string;
  numberLabel: string;
  numberPlaceholder: string;
  requiredField: string;
  invalidEmail: string;
  emailsDoNotMatch: string;
  invalidLink: string;
  invalidLinkDescription: string;
  paymentConfirmed: string;
  paymentConfirmedDescription: string;
  exclusiveOffer: string;
  exclusiveOfferPlural: string;
  buyNow: string;
  backToHome: string;
  youMayAlsoLike: string;
  addToOrder: string;
  total: string;
  securePayment: string;
  purchaseDetails: string;
  instantAccess: string;
  instantAccessDescription: string;
  securePaymentDescription: string;
  privacyText: string;
  safeText: string;
  deliveryText: string;
  approvedText: string;
  additionalProduct: string;
  safeSite: string;
  variousPaymentMethods: string;
  secureCheckoutTechnology: string;
  allRightsReserved: string;
  timerText: string;
};

const translations: Record<string, TranslationKeys> = {
  pt: {
    emailLabel: "Seu e-mail", emailPlaceholder: "Seu e-mail", confirmEmailLabel: "Confirme seu e-mail", confirmEmailPlaceholder: "Digite seu e-mail novamente",
    nameLabel: "Nome", namePlaceholder: "Seu primeiro nome", fullNameLabel: "Nome completo", fullNamePlaceholder: "Digite seu nome completo",
    surnameLabel: "Sobrenome", surnamePlaceholder: "Seu sobrenome", cpfLabel: "CPF", cpfPlaceholder: "000.000.000-00",
    cnpjLabel: "CNPJ", cnpjPlaceholder: "00.000.000/0000-00", phoneLabel: "Número de Telefone", phonePlaceholder: "(00) 00000-0000",
    zipLabel: "CEP", zipPlaceholder: "00000-000", streetLabel: "Rua / Logradouro", streetPlaceholder: "Nome da rua",
    numberLabel: "Número", numberPlaceholder: "Nº", requiredField: "Campo obrigatório", invalidEmail: "E-mail inválido",
    emailsDoNotMatch: "Os e-mails não coincidem", invalidLink: "Link Inválido", invalidLinkDescription: "Este checkout não existe ou foi desativado.",
    paymentConfirmed: "Pagamento Confirmado!", paymentConfirmedDescription: "Obrigado pela sua compra. Verifique seu e-mail para acessar o produto.",
    exclusiveOffer: "Espere! Aproveite esta oferta exclusiva", exclusiveOfferPlural: "Espere! Aproveite estas ofertas exclusivas",
    buyNow: "Comprar Agora", backToHome: "Voltar para o Início", youMayAlsoLike: "Você também pode gostar",
    addToOrder: "Adicionar produto", total: "Total", securePayment: "Pagamento 100% Seguro",
    purchaseDetails: "Detalhes da compra", instantAccess: "ACESSO IMEDIATO", instantAccessDescription: "Seu produto disponível em instantes",
    securePaymentDescription: "Dados protegidos e criptografados", privacyText: "Suas informações estão 100% seguras",
    safeText: "Compra segura", deliveryText: "Entrega via E-mail", approvedText: "Conteúdo aprovado",
    additionalProduct: "Produto adicional", timerText: "Oferta Especial por Tempo Limitado!",
    safeSite: "Site protegido", variousPaymentMethods: "Diversas formas de pagamento",
    secureCheckoutTechnology: "Você está em uma página de checkout segura, criada com a tecnologia Meteorfy. A responsabilidade pela oferta é do vendedor.",
    allRightsReserved: "© 2026 Meteorfy Inc. Todos os direitos reservados.",
  },
  en: {
    emailLabel: "Your email", emailPlaceholder: "Enter your email", confirmEmailLabel: "Confirm your email", confirmEmailPlaceholder: "Enter your email again",
    nameLabel: "First Name", namePlaceholder: "Your first name", fullNameLabel: "Full Name", fullNamePlaceholder: "Enter your full name",
    surnameLabel: "Last Name", surnamePlaceholder: "Your last name", cpfLabel: "CPF", cpfPlaceholder: "000.000.000-00",
    cnpjLabel: "CNPJ", cnpjPlaceholder: "00.000.000/0000-00", phoneLabel: "Phone Number", phonePlaceholder: "(00) 00000-0000",
    zipLabel: "ZIP Code", zipPlaceholder: "00000-000", streetLabel: "Street Address", streetPlaceholder: "Street name",
    numberLabel: "Number", numberPlaceholder: "No.", requiredField: "Required field", invalidEmail: "Invalid email",
    emailsDoNotMatch: "Emails do not match", invalidLink: "Invalid Link", invalidLinkDescription: "This checkout does not exist or has been disabled.",
    paymentConfirmed: "Payment Confirmed!", paymentConfirmedDescription: "Thank you for your purchase. Check your email to access the product.",
    exclusiveOffer: "Wait! Take advantage of this exclusive offer", exclusiveOfferPlural: "Wait! Take advantage of these exclusive offers",
    buyNow: "Buy Now", backToHome: "Back to Home", youMayAlsoLike: "You may also like",
    addToOrder: "Add to purchase", total: "Order total", securePayment: "Secure Payment",
    purchaseDetails: "Purchase details", instantAccess: "INSTANT ACCESS", instantAccessDescription: "Your product available instantly",
    securePaymentDescription: "Protected and encrypted data", privacyText: "Your information is 100% secure",
    safeText: "Safe purchase", deliveryText: "Delivery via Email", approvedText: "Approved content",
    additionalProduct: "Additional product", timerText: "Special Limited Time Offer!",
    safeSite: "Safe Site", variousPaymentMethods: "Various payment methods",
    secureCheckoutTechnology: "You are on a secure checkout page, created with Meteorfy technology. Responsibility for the offer lies with the seller.",
    allRightsReserved: "© 2026 Meteorfy Inc. All rights reserved.",
  },
  es: {
    emailLabel: "Tu email", emailPlaceholder: "Introduce tu email", confirmEmailLabel: "Confirma tu email", confirmEmailPlaceholder: "Introduce tu email novamente",
    nameLabel: "Nombre", namePlaceholder: "Su primer nombre", fullNameLabel: "Tu nombre completo", fullNamePlaceholder: "Ingrese su nombre completo",
    surnameLabel: "Apellido", surnamePlaceholder: "Su apellido", cpfLabel: "CPF", cpfPlaceholder: "000.000.000-00",
    cnpjLabel: "CNPJ", cnpjPlaceholder: "00.000.000/0000-00", phoneLabel: "Número de Teléfono", phonePlaceholder: "(00) 00000-0000",
    zipLabel: "Código Postal", zipPlaceholder: "00000-000", streetLabel: "Calle / Dirección", streetPlaceholder: "Nombre de la calle",
    numberLabel: "Número", numberPlaceholder: "Nº", requiredField: "Campo obligatorio", invalidEmail: "Correo inválido",
    emailsDoNotMatch: "Los correos no coinciden", invalidLink: "Enlace Inválido", invalidLinkDescription: "Este checkout no existe o fue desactivado.",
    paymentConfirmed: "¡Pago Confirmado!", paymentConfirmedDescription: "Gracias por su compra. Revise su correo para acceder al producto.",
    exclusiveOffer: "¡Espere! Aproveche esta oferta exclusiva", exclusiveOfferPlural: "¡Espere! Aproveche estas ofertas exclusivas",
    buyNow: "Comprar ahora", backToHome: "Volver al Inicio", youMayAlsoLike: "También te puede gustar",
    addToOrder: "Añadir a la compra", total: "Total a pagar", securePayment: "Pago Seguro",
    purchaseDetails: "Detalles de la compra", instantAccess: "ACCESO INMEDIATO", instantAccessDescription: "Su produto disponible al instante",
    securePaymentDescription: "Datos protegidos y encriptados", privacyText: "Su información está 100% segura",
    safeText: "Compra segura", deliveryText: "Entrega por Correo Electrónico", approvedText: "Contenido aprobado",
    additionalProduct: "Producto adicional", timerText: "¡Oferta especial por tiempo limitado!",
    safeSite: "Sitio protegido", variousPaymentMethods: "Diversas formas de pago",
    secureCheckoutTechnology: "Estás en una página de pago segura, creada con tecnología Meteorfy. La responsabilidad de la oferta es del vendedor.",
    allRightsReserved: "© 2026 Meteorfy Inc. Todos los derechos reservados.",
  },
};

export function getTranslations(language: string): TranslationKeys {
  return translations[language] || translations.pt;
}

export type { TranslationKeys };