import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Shared frame for Daftar, Masuk, Verifikasi, Lupa/Atur sandi. */
export function AuthCard({ title, description, children, footer }: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Card className="gap-0 rounded-2xl p-6 ring-border sm:p-8">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        Mode demo: akun disimpan di browser ini saja, email tidak benar-benar dikirim.
      </p>
    </div>
  );
}

export function AuthSkeleton() {
  return <div className="mx-auto my-16 h-[520px] w-full max-w-md animate-pulse rounded-2xl bg-muted" aria-label="Memuat" />;
}
