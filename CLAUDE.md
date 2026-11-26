# Instrucciones del repositorio

Una conversación, un cliente: no mezcles contexto, datos ni decisiones de clientes distintos. Si la petición no indica el cliente, pregunta cuál es antes de empezar.

## Clientes con company brain

- **Munich** (email marketing): cualquier petición sobre Munich, aunque sea pequeña, se delega al agente `munich-email`. El agente lee `agentes/munich-email/` antes de responder. No analices ni respondas tú directamente datos de Munich. Si el usuario adjunta un CSV, pásaselo al agente. Las tareas independientes se lanzan en paralelo.
