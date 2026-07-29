"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "./index";

export const authClient = createAuthClient({
  plugins: [organizationClient(), inferAdditionalFields<Auth>()],
});
