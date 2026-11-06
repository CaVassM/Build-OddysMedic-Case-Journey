// Datos extremos para comprobar la ficha y las opciones. Solo se usan en desarrollo con ?data=worst.

export const worstCasePatient = {
  initial: "M",
  name: "María José de la Cruz y Fernández-Wiśniewska Oberhauser",
  caseTitle: "Consulta por cansancio persistente con intolerancia al frío y estreñimiento",
  chips: [
    "101 años",
    "Mujer",
    "Consulta ambulatoria de endocrinología y metabolismo del hospital regional",
    "Cansancio persistente de varios meses con intolerancia al frío y estreñimiento progresivo",
  ],
};

export const worstCaseStop = {
  question:
    "Con TSH alta y T4 libre baja en una paciente sin tratamiento previo, sin amiodarona ni litio, ¿qué diagnóstico explica mejor el perfil tiroideo presentado en esta consulta?",
  options: [
    {
      text: "Hipotiroidismo primario manifiesto de probable etiología autoinmune por tiroiditis de Hashimoto, con repercusión clínica y bioquímica, sin criterios de coma mixedematoso ni insuficiencia suprarrenal asociada",
      explanation:
        "Integra TSH alta y T4 libre baja, y es coherente con una falla de la glándula tiroides sin datos de enfermedad hipofisaria, aunque conviene confirmar la causa con anticuerpos antiperoxidasa si cambia el manejo.",
      correct: true,
    },
    { text: "Ninguna", explanation: "No." },
    {
      text: "Hipotiroidismo-secundario-a-deficiencia-de-hormona-liberadora-de-tirotropina-hipotalámica-congénita",
      explanation:
        "TSH marcadamente alta favorece falla primaria y descarta un origen hipotalámico, que cursaría con TSH baja o inapropiadamente normal.",
    },
    {
      text: "Hipertiroidismo primario",
      explanation: "El patrón hormonal es opuesto.",
    },
  ],
};
