"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, Clock, FileCheck, Brain, ArrowRight, MapPin,
  AlertTriangle, CheckCircle2, Users, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-gentle flex flex-col items-center gap-3">
          <MapPin className="h-10 w-10 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">InsideCanada</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/login")}>Sign In</Button>
            <Button onClick={() => router.push("/signup")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Built for people already in Canada
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              Never miss a deadline.<br />
              <span className="text-primary">Protect your status.</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl">
              InsideCanada is your immigration operating system — tracking permits, detecting risks,
              and guiding you from PGWP to PR with calm, clear, deadline-driven advice.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => router.push("/signup")} className="text-base">
                Start Your Case
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push("/login")} className="text-base">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-white border-t">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need to stay in status</h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            From permit tracking to PR planning, InsideCanada prevents refusals, missed deadlines, and status loss.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: "Deadline Tracking", desc: "Automatic alerts for permit expiry, passport renewal, language test validity, and application deadlines." },
              { icon: AlertTriangle, title: "Risk Detection", desc: "AI-powered risk analysis flags issues before they become problems — maintained status, gaps, missing documents." },
              { icon: Brain, title: "AI Advisor", desc: "Ask questions in plain English. Get personalized guidance based on your actual case, not generic info." },
              { icon: FileCheck, title: "Document Vault", desc: "Secure storage for all immigration documents. Know exactly what you have and what's missing." },
              { icon: CheckCircle2, title: "PR Eligibility", desc: "Real-time eligibility checks for CEC, FSW, and PNP pathways based on your profile." },
              { icon: Users, title: "Expert Escalation", desc: "When AI isn't enough, connect with licensed RCICs and immigration lawyers." },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-primary text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Landmark className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Your immigration journey, organized.</h2>
          <p className="text-lg opacity-90 mb-8">
            Join thousands of PGWP holders and recent graduates who trust InsideCanada to protect their status and plan their future.
          </p>
          <Button size="lg" variant="secondary" onClick={() => router.push("/signup")} className="text-base">
            Create Your Free Account
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-semibold">InsideCanada</span>
          </div>
          <p className="text-sm text-gray-500">
            Not legal advice. Always consult a licensed RCIC or immigration lawyer for your specific situation.
          </p>
        </div>
      </footer>
    </div>
  );
}
