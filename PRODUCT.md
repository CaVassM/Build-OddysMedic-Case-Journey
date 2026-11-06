# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Principal:** estudiantes de medicina de 4.º y 5.º año, en español (Perú y Latinoamérica). Usan OddysMedic fuera de clase, en sesiones cortas de 5 a 10 minutos en laptop, para practicar decisiones clínicas antes de rotaciones y exámenes.

**Secundario, a futuro:** docentes que revisan el avance del grupo. Todavía no hay superficies para este usuario.

## Product Purpose

OddysMedic permite practicar decisiones clínicas caso a caso. Cada caso avanza por paradas (diagnóstico, tratamiento y seguimiento), y el sistema aprende de las respuestas del alumno para elegir qué practica después.

## Positioning

OddysMedic adapta las preguntas y las rutas de aprendizaje según las capacidades de cada alumno.

## Operating Context

- Sesiones cortas fuera de clase, en laptop, antes de rotaciones y exámenes.
- Hoy es un prototipo para una demo el domingo 8 de noviembre de 2026; aún no hay uso real.

## Capabilities and Constraints

- **Motor adaptativo (Elo):** cada competencia tiene un nivel θ y un número de respuestas n. El sistema estima la probabilidad de acierto y busca que quede cerca del 75 %.
- **Adaptación dentro del caso:** una parada puede tener variantes autorizadas de la misma pregunta. El motor elige una al empezar el caso y el plan queda fijo hasta terminarlo.
- **Evidencia mínima:** no se muestra el estado de una competencia con menos de 2 respuestas.
- **«No sé»** es una respuesta válida: cuenta como no acertada y también informa al motor.
- **Prototipo:** los números son ilustrativos. No hay cuentas reales ni datos que persistan entre sesiones.
- **Términos del producto:** caso, parada, competencia, ruta, variante «Estándar» y «Guiada».

## Brand Commitments

- Sistema «Mar vinoso»: #2E2A78, aguamarina #43D6BE y tinta #1A1840, con Bricolage Grotesque y Atkinson Hyperlegible para la interfaz, y Newsreader solo para el relato clínico.
- Fondo de papel cálido #FAF8F5. Solo los objetos son tarjetas: la ficha del paciente, «Tu siguiente caso» y el panel del caso.
- Los pacientes tienen cara: retratos ilustrados sobre un círculo pastel, nunca fotos.
- Tono amigable pero adulto, nada infantil.
- Sin gamificación tipo racha o vidas.

## Evidence on Hand

- **Contenido clínico:** casos ficticios basados en guías: NICE NG145 en el caso de Elena; ADA 2026 y otras en el resto del banco.
- **Estado de validación:** el contenido aún NO tiene validación médica. Los casos están en estado «Borrador» o «Listo para revisión».
- **Retratos:** estilo Open Peeps de Pablo Stanley, con licencia CC0 1.0 según el archivo `LICENSE` de `@dicebear/open-peeps` 9.4.2; el código de DiceBear es MIT. Se generan en local con `@dicebear/core` y `@dicebear/collection`, sin peticiones a la API de DiceBear. Los pacientes son ficticios.
- **Historial de ejemplo:** las 9 respuestas de Lucía y Marta en `src/history.ts`, con su seguridad, sus errores y su θ tras cada intento, son datos sembrados para la demo y no reflejan a ningún alumno real. Los títulos «Confunde el orden de prioridades» y «Confunde causa y desencadenante» se escribieron para este ejemplo y no vienen del banco.
- **Tiempo estimado:** el «~2 min por decisión» y los «6 minutos» por caso salen de la ficha de Elena («unos 6 minutos», tres paradas); no son una medición.
- **Sin evidencia de uso:** no hay testimonios, clientes, estudios de eficacia ni métricas reales. No inventarlos.
- **Cifras ilustrativas:** niveles de competencia, probabilidades, total de casos y progreso son datos de demo, no resultados medidos.

## Product Principles

1. **Nunca presentar el contenido como validado.** Citar una guía indica en qué se basa un caso, no que un médico lo haya revisado.
2. **La adaptación se puede explicar.** Cuando el sistema elige algo por el alumno, debe poder decir qué eligió y por qué.
3. **Sin conclusiones con poca evidencia.** Es preferible decir que aún no se sabe a inventar un estado.
4. **No saber es información, no un fracaso.** Equivocarse o responder «No sé» sirve para decidir qué practicar, sin castigos ni recompensas de juego.
5. **Respetar sesiones de 5 a 10 minutos.** Cada caso debe poder empezarse y terminarse en una sola sentada.

## Accessibility & Inclusion

WCAG AA.

## Pendiente

Decidido dejarlo para después de la demo del 8 de noviembre de 2026, que es en laptop:

- **Teléfono:** en anchos pequeños, el panel «Lo que sabes de Elena» se ve antes de la pregunta pero va después en el orden de tabulación, y varios controles miden menos de 44 px.
- **Modo oscuro y tokens:** los colores están fijos en el CSS, sin tokens ni tema oscuro.
- **Recarga a mitad del caso:** recargar vuelve a la parada 1, aunque conserva la variante elegida.
- **Semántica de la ruta:** la ruta de paradas no es una lista ni marca la parada actual con `aria-current`.
