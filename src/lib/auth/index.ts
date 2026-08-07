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

// requireEmailVerification si attiva in produzione col dominio Resend verificato
// (PRE-LAUNCH Fase 11); il sender è già cablato e in dev logga il link.
export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
