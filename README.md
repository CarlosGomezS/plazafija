# PlazaFija · Guía para publicarla y empezar a cobrar

Web de tests de oposiciones con 235 preguntas explicadas (Constitución, Ley 39/2015, Ley 40/2015, TREBEP, Ley del Gobierno, Igualdad, Transparencia y Protección de Datos) y psicotécnicos ilimitados. Modelo freemium: 15 preguntas gratis al día y suscripción Premium de 4,99 €/mes o 29 €/año.

Todo funciona con planes gratuitos: **Cloudflare Pages** (web y servidor) y **Stripe** (cobros, solo comisión por venta).

---

## Qué hay en la carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `src/questions.js` | **El banco de preguntas.** Aquí añades o corriges preguntas. |
| `src/app.js`, `src/psico.js`, `src/styles.css` | La app (pantallas, tests, pagos) y el generador de psicotécnicos. |
| `build.mjs` | Genera la web. Arriba del todo están los **datos que debes cambiar** (dominio, precios, tus datos legales). |
| `functions/api/` | El servidor: pagos con Stripe, acceso Premium y entrega de preguntas de pago. |
| `dist/` | La web ya generada, lista para publicar. |
| `demo/index.html` | Demo en un solo archivo (sin pagos reales). |
| `test.mjs` | Pruebas automáticas del servidor y del generador. |

Las preguntas de pago **no** van en la web pública: solo las entrega el servidor a quien tiene la suscripción activa. Una de cada tres preguntas es gratuita y aparece en las páginas públicas para que Google las indexe.

---

## Paso 1 · Prepara tu ordenador (una sola vez)

1. Instala **Node.js** (versión 20 o superior) desde nodejs.org.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm test` para comprobar que todo está bien. Deben salir 11 pruebas en verde.

## Paso 2 · Cambia tus datos

Abre `build.mjs` y edita el bloque `SITE`:

- `owner`: tu nombre, NIF, dirección y email. Aparecen en el aviso legal, la privacidad y las condiciones (obligatorio por la LSSI).
- `prices`: los precios que se muestran. Deben coincidir con los que crees en Stripe.
- `url`: déjalo así por ahora; lo cambiarás cuando tengas dominio.

## Paso 3 · Crea la cuenta de Stripe

1. Regístrate en stripe.com y completa la verificación (DNI y cuenta bancaria).
2. En **Catálogo de productos**, crea un producto «PlazaFija Premium» con dos precios recurrentes:
   - 4,99 € cada mes
   - 29 € cada año
3. Copia el ID de cada precio (empieza por `price_...`).
4. En **Desarrolladores → Claves de API**, copia la clave secreta (`sk_live_...`). Para probar primero sin cobrar de verdad, usa el **modo de prueba** (`sk_test_...`).
5. En **Configuración → Portal de clientes**, activa el portal y permite cancelar suscripciones. La app lo usa para el botón «Gestionar suscripción».

## Paso 4 · Publica en Cloudflare Pages (gratis)

1. Regístrate en cloudflare.com.
2. En la terminal, dentro de esta carpeta:
   ```
   npx wrangler login
   npm run deploy
   ```
   La primera vez te preguntará si crea el proyecto `plazafija`: responde que sí. Al terminar te dará la dirección, tipo `https://plazafija.pages.dev`.
3. En el panel de Cloudflare: **Workers y Pages → plazafija → Configuración → Variables y secretos**, añade (como «Secreto»):

   | Nombre | Valor |
   |---|---|
   | `STRIPE_SECRET_KEY` | tu clave `sk_live_...` (o `sk_test_...` para probar) |
   | `STRIPE_PRICE_MONTH` | el `price_...` mensual |
   | `STRIPE_PRICE_YEAR` | el `price_...` anual |
   | `TOKEN_SECRET` | una frase larga e inventada (40 caracteres o más) que no compartas con nadie |

4. Vuelve a ejecutar `npm run deploy` para que tome las variables.

**Prueba completa:** con claves de prueba, suscríbete usando la tarjeta `4242 4242 4242 4242` (fecha futura y cualquier CVC). Debes ver la pantalla de bienvenida con tu código de acceso y el banco completo. Después cambia a las claves `sk_live_` y vuelve a desplegar.

## Paso 5 · Que te encuentre Google

1. Si compras un dominio propio (unos 10 €/año), conéctalo en Cloudflare Pages → Dominios personalizados, cambia `url` en `build.mjs` y vuelve a desplegar.
2. Da de alta la web en **Google Search Console** y envía el sitemap: `https://tu-web/sitemap.xml`.
3. Ya tienes páginas indexables por ley, como `/tests/constitucion-espanola/`, con preguntas y soluciones visibles. Cuantas más preguntas gratuitas buenas haya, más búsquedas captarás.

## Paso 6 · Conseguir los primeros suscriptores

Google tarda de 2 a 6 meses en posicionar una web nueva. Mientras tanto:

- **TikTok / Instagram Reels**: vídeos de 15-30 segundos con una pregunta («¿Sabrías responder esta pregunta de Auxiliar Administrativo?»), la respuesta al final y el enlace en la biografía. 1-2 al día.
- **Grupos de Telegram y foros de opositores**: comparte las páginas `/tests/...` cuando aporten algo a la conversación, sin hacer spam.
- **Mide**: en Stripe verás suscriptores e ingresos. 100 suscriptores mensuales son unos 500 €.

---

## Añadir o corregir preguntas

Cada pregunta en `src/questions.js` es una línea así:

```js
["CE","Enunciado de la pregunta",["Opción A","Opción B","Opción C","Opción D"],1,"Art. 12 CE","Explicación de la respuesta."],
```

- El primer valor es el bloque (`CE`, `L39`, `L40`, `TREBEP`, `GOB`, `IGU`, `TRA`, `LPD`).
- El número es la opción correcta, empezando en 0 (0 = A, 1 = B, 2 = C, 3 = D).
- Añade las preguntas nuevas **al final de su bloque** o al final del archivo, para no descolocar el progreso guardado de los usuarios.

Después ejecuta `npm run deploy`. El build comprueba que cada pregunta tenga 4 opciones distintas, una respuesta válida, referencia y explicación; si algo falla, te dice qué pregunta es y no publica.

**Revisa siempre el contenido con el texto consolidado del BOE.** Un error en un test de oposiciones quita credibilidad y suscriptores.

## Aspectos legales y fiscales

- Si cobras de forma habitual, en España normalmente tendrás que **darte de alta como autónomo** y declarar el IVA (21 % incluido en el precio) y el IRPF. Consulta con un gestor antes de activar las claves reales.
- Revisa con él también los textos de aviso legal, privacidad y condiciones que se generan en `dist/legal/`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Pasa las pruebas automáticas (ejecuta antes `npm run build`). |
| `npm run build` | Genera `dist/`, `demo/` y los datos del servidor. |
| `npm run dev` | Prueba la web en tu ordenador (copia `.dev.vars.example` como `.dev.vars` con claves de prueba). |
| `npm run deploy` | Genera y publica en Cloudflare Pages. |
