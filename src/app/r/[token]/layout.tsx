import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";

export default function ManagerResponseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto box-border min-h-dvh px-4 py-10",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      {children}
    </div>
  );
}
