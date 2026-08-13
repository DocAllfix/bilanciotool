import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { verificaAccessiDisponibili } from "@/features/auth/limite-accessi";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendVerificationEmail, sendResetPasswordEmail, sendOrgInvitationEmail } from "@/lib/email";
import { createStudioOrg, firstMembershipOrgId, hasPendingInvitation } from "@/features/auth/orgs";

// La verifica dell'indirizzo è ACCESA dal 2026-08-11, con il dominio Resend verificato.
// Gli account creati prima sono stati marcati come verificati: una regola introdotta
// dopo non può chiudere fuori chi si era iscritto quando non esisteva.
export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    // Senza, chiunque si registra con un indirizzo che non esiste: gli si apre uno
    // studio, si semina l'azienda dimostrativa, e non gli arriverà mai niente — né la
    // reimpostazione della password, né la ricevuta di un pagamento.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // Limite di frequenza sulle rotte di autenticazione.
  //
  // `storage: "database"` e non la memoria: su Vercel ogni istanza ha la propria, e un
  // contatore che si azzera a ogni avvio a freddo non ferma nessuno — basta che i
  // tentativi cadano su istanze diverse. Il costo e' una scrittura per richiesta, che a
  // questi volumi non si vede.
  //
  // I numeri sono tarati su una persona vera, non su un attaccante: dieci accessi
  // sbagliati in cinque minuti non capitano a chi ricorda male la password, capitano a
  // chi le prova. La registrazione e il recupero sono piu' stretti perche' ognuno di
  // essi manda un'email: senza freno diventano un mezzo per molestare terzi.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      // Dieci e non cinque: uno studio che iscrive i colleghi da un solo ufficio esce
      // verso Internet con un indirizzo solo, e i nostri stessi collaudi registrano un
      // utente ciascuno. Il freno serve contro le migliaia, non contro la decina.
      "/sign-up/email": { window: 3600, max: 10 },
      // Due nomi per la stessa cosa: `/forget-password` e' quello storico,
      // `/request-password-reset` quello che chiama `authClient.requestPasswordReset`.
      // Tararne uno solo lascia l'altro col limite generico, e quello e' l'endpoint che
      // manda un'email a un indirizzo altrui: senza freno diventa un mezzo per molestare.
      "/forget-password": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
    },
  },
  user: {
    additionalFields: {
      // Ruolo di piattaforma (staff vendor): input:false = non auto-assegnabile dal client.
      platformRole: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Ogni self-signup crea il proprio studio (tenant) in stato demo,
          // con l'azienda dimostrativa già compilata (il cuore del funnel).
          // Gli invitati NON ricevono uno studio proprio: entreranno in quello che li invita.
          if (await hasPendingInvitation(user.email)) return;
          const orgId = await createStudioOrg(user.id, user.name ?? "");
          try {
            const { seedDemoCompany } = await import("@/features/demo/seed-demo-org");
            await seedDemoCompany(user.id, orgId);
          } catch (e) {
            // Il seed demo non deve MAI bloccare una registrazione.
            console.error("[demo] seed fallito per", orgId, e);
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const orgId = await firstMembershipOrgId(session.userId);
          return { data: { ...session, activeOrganizationId: orgId } };
        },
      },
    },
  },
  // Il limite di accessi si applica qui, prima che il plugin faccia il suo lavoro: le rotte
  // degli inviti sono sue e non passano da nessuna nostra server action.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      await verificaAccessiDisponibili(ctx as never);
    }),
  },
  plugins: [
    organization({
      // Rete di sicurezza statica, tenuta ALTA di proposito: il limite che conta è quello
      // del piano acquistato (2, 5 o 10 accessi), applicato dall'aggancio qui sopra. Se
      // questo numero fosse più basso del piano più capiente, taglierebbe fuori chi ha
      // pagato per averne di più — ed era esattamente il difetto di prima, con 5 fisso.
      membershipLimit: 100,
      sendInvitationEmail: async (data) => {
        const url = `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invitation/${data.id}`;
        await sendOrgInvitationEmail(data.email, data.organization.name, url);
      },
    }),
    nextCookies(), // deve restare ultimo
  ],
});

export type Auth = typeof auth;
