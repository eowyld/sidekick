/**
 * Limitation de débit à fenêtre fixe, en mémoire du processus.
 *
 * Portée réelle : chaque instance de fonction Vercel a sa propre mémoire, et
 * elle est perdue à froid. Ce n'est donc pas un rempart contre une attaque
 * distribuée — c'est un garde-fou contre le cas courant : une boucle, un
 * double-clic, un script maladroit, un compte qui s'emballe. Pour l'alpha,
 * c'est le bon rapport entre protection et complexité ; un limiteur partagé
 * (Redis, table Postgres) se justifiera quand le trafic l'exigera.
 *
 * Les routes protégées doivent de toute façon exiger une authentification :
 * la limite se pose alors par utilisateur, pas par adresse IP, qu'un client
 * peut faire varier.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Purge opportuniste : sans elle la Map grandirait indéfiniment. */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Secondes avant la réouverture de la fenêtre — pour l'en-tête Retry-After. */
  retryAfter: number;
};

export function rateLimit(args: {
  /** Identifiant stable : préférer l'id utilisateur à l'adresse IP. */
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(args.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(args.key, { count: 1, resetAt: now + args.windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= args.limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Réponse 429 normalisée, avec l'en-tête que les clients savent lire. */
export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
