import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  MessageSquare,
  ShieldAlert,
  Briefcase,
  Users,
  Cpu,
  ChevronRight,
  Send,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { GithubIcon, TwitterIcon, DiscordIcon } from '../components/icons';
import StaticPageLayout from '../components/StaticPageLayout';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'Technical Support',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    setIsSubmitting(true);

    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `From: ${formData.name} (${formData.email}) [${formData.category}]\n\n${formData.message}`,
        }),
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }

    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', category: 'Technical Support', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Address',
      desc: 'ansarisahil3690@gmail.com',
      link: 'mailto:ansarisahil3690@gmail.com',
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-400',
    },
    {
      icon: <GithubIcon className="w-6 h-6" />,
      title: 'GitHub Profile',
      desc: 'github.com/SSSahil15',
      link: 'https://github.com/SSSahil15',
      color: 'from-slate-500/20 to-slate-600/20',
      iconColor: 'text-slate-300',
    },
    {
      icon: <DiscordIcon className="w-6 h-6" />,
      title: 'Discord Support',
      desc: 'Join our Server',
      link: 'https://discord.gg/gGaqBAVrGq',
      color: 'from-indigo-500/20 to-indigo-600/20',
      iconColor: 'text-indigo-400',
    },
  ];

  const supportCategories = [
    {
      icon: <Cpu className="w-5 h-5" />,
      title: 'Technical Support',
      desc: 'API issues, integration help',
    },
    {
      icon: <ShieldAlert className="w-5 h-5" />,
      title: 'Security Reports',
      desc: 'Vulnerability disclosures',
    },
    {
      icon: <Briefcase className="w-5 h-5" />,
      title: 'Enterprise',
      desc: 'Custom SLA, dedicated support',
    },
    { icon: <Users className="w-5 h-5" />, title: 'Partnerships', desc: 'Business inquiries' },
  ];

  const faqs = [
    {
      q: 'What is your typical response time?',
      a: 'We aim to respond to all standard inquiries within 24 hours. Enterprise customers receive priority support with a 4-hour SLA.',
    },
    {
      q: 'Do you offer phone support?',
      a: 'Phone support is currently reserved for our Enterprise plan members. All other users can reach us via email or Discord.',
    },
    {
      q: 'Where can I find API documentation?',
      a: 'Our comprehensive API documentation is available in the Docs section, complete with code examples and interactive endpoints.',
    },
  ];

  return (
    <StaticPageLayout>
      <div className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          {/* Header Section */}
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              We're here to help
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-6"
            >
              Connect with the <br className="hidden md:block" /> DevPulse team.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-slate-400 max-w-2xl mx-auto"
            >
              Whether you have a technical question, want to explore enterprise options, or just
              want to say hi, our team is ready to assist you.
            </motion.p>
          </div>

          {/* Contact Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {contactMethods.map((method, idx) => (
              <motion.a
                href={method.link}
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                className="group relative p-6 rounded-3xl bg-[#0d1117] border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${method.color} transition-opacity duration-500`}
                />
                <div className="relative z-10 flex flex-col items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${method.iconColor}`}
                  >
                    {method.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{method.title}</h3>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {method.desc}
                    </p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Left Column: Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="lg:col-span-7"
            >
              <div className="p-8 rounded-[2rem] bg-[#0d1117] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Send us a message</h2>
                  <p className="text-slate-400">We'd love to hear your thoughts on DevPulse</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">Your Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">
                      How can we help?
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {supportCategories.map((cat, idx) => (
                          <option key={idx} value={cat.title} className="bg-slate-800 text-white">
                            {cat.title}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Message</label>
                    <textarea
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows="5"
                      placeholder="Tell us what you need help with..."
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors" />
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : submitted ? (
                      <span className="flex items-center gap-2">Message Sent!</span>
                    ) : (
                      <span className="flex items-center gap-2 relative z-10">
                        Send us a message
                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Right Column: SLA & FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="lg:col-span-5 space-y-6"
            >
              {/* SLA Section */}
              <div className="p-6 rounded-3xl bg-indigo-900/10 border border-indigo-500/20 backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Response SLA</h3>
                    <p className="text-sm text-slate-400 mb-3">
                      Our global support team is active 24/7 across multiple timezones.
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <div className="px-3 py-1 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-300">
                        Standard: <span className="text-white">{'< 24h'}</span>
                      </div>
                      <div className="px-3 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                        Enterprise: <span className="text-white">{'< 4h'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0d1117] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  Support Categories
                </h3>
                <div className="space-y-4">
                  {supportCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">{cat.icon}</div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-200">{cat.title}</h4>
                        <p className="text-xs text-slate-500">{cat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0d1117] border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked</h3>
                <div className="space-y-5">
                  {faqs.map((faq, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-medium text-slate-200 mb-1">{faq.q}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
                <a
                  href="/docs"
                  className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 mt-5 transition-colors"
                >
                  View all documentation <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
};

export default ContactPage;
