import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function NavBar() {
  const session = await getSession();
  if (!session) return null;

  const links =
    session.role === "duena"
      ? [
          { href: "/panel", label: "Panel" },
          { href: "/productos", label: "Productos" },
          { href: "/registrar", label: "Registrar" },
        ]
      : [{ href: "/registrar", label: "Registrar" }];

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl" aria-hidden>
            🍯
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">DistriVariedades</p>
            <p className="hidden sm:block text-xs text-muted leading-tight truncate">
              {session.role === "duena" ? "Panel de la dueña" : `Hola, ${session.name}`}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2.5 sm:gap-5 shrink-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs sm:text-sm font-medium text-foreground/80 hover:text-honey-dark transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
