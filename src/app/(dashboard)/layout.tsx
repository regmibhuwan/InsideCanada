import { Sidebar } from "@/components/shared/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
