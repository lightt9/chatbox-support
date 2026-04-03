'use client';

import {
  Zap, Shield, BarChart3, MessageSquare, Globe, Clock,
  ArrowRight, Star, CheckCircle2, Sparkles,
} from 'lucide-react';
import { ChatWidget } from './chat-widget';

const features = [
  { icon: MessageSquare, title: 'AI-Powered Chat', desc: 'Instant responses powered by advanced AI that understands context and intent.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant with end-to-end encryption for all conversations.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Sub-second response times with intelligent routing and caching.' },
  { icon: Globe, title: 'Multi-Channel', desc: 'Connect via web, WhatsApp, Telegram, and email from one dashboard.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Real-time insights into customer satisfaction and agent performance.' },
  { icon: Clock, title: '24/7 Available', desc: 'AI handles queries round the clock, escalating to humans when needed.' },
];

const plans = [
  { name: 'Starter', price: '$29', period: '/mo', features: ['1,000 conversations', '2 agents', 'AI chatbot', 'Email support'], popular: false },
  { name: 'Growth', price: '$79', period: '/mo', features: ['10,000 conversations', '10 agents', 'AI + Knowledge Base', 'Priority support', 'Analytics'], popular: true },
  { name: 'Enterprise', price: '$199', period: '/mo', features: ['Unlimited conversations', 'Unlimited agents', 'Custom AI training', 'Dedicated CSM', 'SLA guarantee', 'SSO & audit logs'], popular: false },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'VP of Support, TechFlow', text: 'ChatBox reduced our response time by 73%. The AI handles 80% of queries automatically.', rating: 5 },
  { name: 'Marcus Johnson', role: 'CTO, ScaleUp Inc', text: 'The seamless handover between AI and human agents is game-changing. Our CSAT scores are through the roof.', rating: 5 },
  { name: 'Elena Rodriguez', role: 'Head of CX, RetailPro', text: 'We deployed ChatBox in 2 hours. Within a week, our support costs dropped 40%.', rating: 5 },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ChatBox</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">Sign In</a>
            <button className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 lg:pt-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-50 blur-3xl" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-indigo-50 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            AI-Powered Customer Support
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-7xl">
            Support that <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">scales</span> with you
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 lg:text-xl">
            Deliver instant, intelligent customer support across every channel. AI handles the routine; your team focuses on what matters.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button className="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 hover:shadow-xl">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
              Watch Demo
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-500">No credit card required. 14-day free trial.</p>
        </div>

        {/* Dashboard preview */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs text-gray-400">ChatBox Dashboard</span>
            </div>
            <div className="grid grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="col-span-2 border-r border-gray-800 p-3">
                {['Dashboard', 'Conversations', 'Knowledge', 'Reports'].map((item) => (
                  <div key={item} className="mb-1 rounded-md px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
                    {item}
                  </div>
                ))}
              </div>
              {/* Chat list */}
              <div className="col-span-3 border-r border-gray-800 p-3">
                {[
                  { name: 'John D.', msg: 'How do I reset my password?', time: '2m', status: 'green' },
                  { name: 'Sarah C.', msg: 'Pricing question about enterprise', time: '5m', status: 'yellow' },
                  { name: 'Mike R.', msg: 'Feature request: dark mode', time: '12m', status: 'green' },
                ].map((chat) => (
                  <div key={chat.name} className="mb-2 rounded-lg bg-gray-800/50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-200">{chat.name}</span>
                      <span className="text-[10px] text-gray-500">{chat.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">{chat.msg}</p>
                  </div>
                ))}
              </div>
              {/* Main chat */}
              <div className="col-span-7 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center text-xs text-blue-400">JD</div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">John Doe</p>
                    <p className="text-[11px] text-gray-500">Active now</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-gray-800 px-3 py-2 text-xs text-gray-300">
                    How do I reset my password?
                  </div>
                  <div className="ml-auto max-w-[70%] rounded-xl rounded-br-sm bg-blue-600 px-3 py-2 text-xs text-white">
                    Go to Settings &gt; Security &gt; Reset Password. You&apos;ll receive a verification email.
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <Sparkles className="h-3 w-3" /> AI-generated response
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-100 bg-gray-50/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">Everything you need for modern support</h2>
            <p className="mx-auto max-w-2xl text-gray-600">Built for teams that care about customer experience. Powerful enough for enterprise, simple enough to start in minutes.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-6 transition hover:border-blue-100 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">How it works</h2>
            <p className="text-gray-600">Three simple steps to transform your customer support</p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: 'Install Widget', desc: 'Add one line of code to your website. The chat widget appears instantly.', color: 'bg-blue-600' },
              { step: '02', title: 'AI Handles Queries', desc: 'Our AI responds to common questions using your knowledge base.', color: 'bg-indigo-600' },
              { step: '03', title: 'Agents Take Over', desc: 'Complex issues are seamlessly escalated to your support team.', color: 'bg-violet-600' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${s.color} text-lg font-bold text-white`}>
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-gray-100 bg-gray-50/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">Simple, transparent pricing</h2>
            <p className="text-gray-600">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition ${
                  plan.popular
                    ? 'border-blue-200 bg-white shadow-xl shadow-blue-100'
                    : 'border-gray-200 bg-white hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full rounded-full py-3 text-sm font-medium transition ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl">Loved by support teams</h2>
            <p className="text-gray-600">See what our customers have to say</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gray-950 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Ready to transform your support?
          </h2>
          <p className="mb-8 text-gray-400">Join 5,000+ companies delivering exceptional customer experiences.</p>
          <button className="rounded-full bg-blue-600 px-8 py-3.5 text-base font-medium text-white transition hover:bg-blue-700">
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 px-6 py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ChatBox</span>
          </div>
          <p className="text-xs text-gray-500">&copy; 2026 ChatBox. All rights reserved.</p>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
