import { Link } from 'wouter';
import { Sparkles, School, Heart, Users, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth.tsx';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-border">
                    <img src="/logo.png" alt="Smile Stars India Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-primary tracking-tight leading-none">smyl stars india</h1>
                    <span className="text-[0.65rem] text-muted-foreground font-medium tracking-wider uppercase">Safeguarding Little Smiles</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {['Platform', 'Solutions', 'Pricing', 'Resources', 'Participants'].map((item) => (
                <div key={item} className="group relative">
                  <button className="flex items-center space-x-1 text-gray-700 hover:text-primary text-[15px] font-medium transition-colors cursor-pointer">
                    <span>{item}</span>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              ))}
            </nav>

            {/* Buttons */}
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium">
                  Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-primary hover:bg-transparent text-sm font-medium">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-background">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-muted rounded-full blur-3xl opacity-50 -z-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col items-center justify-center min-h-[500px]">

            {/* 2025 UI Wrapped Badge */}
            <div className="inline-flex items-center space-x-2 bg-white border border-border px-4 py-1.5 rounded-full mb-12 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <span className="text-lg">🦷</span>
              <span className="text-sm font-medium text-gray-900"><span className="font-bold">That's a wrap!</span> See how we safeguarded smiles this year. <span className="underline decoration-border group-hover:decoration-gray-900 underline-offset-4 font-bold">2025 Impact Report →</span></span>
            </div>

            {/* Main Content */}
            <div className="w-full flex justify-between items-center relative gap-8">
              {/* Left Decorative Illustration */}
              <div className="hidden lg:block w-64 h-64 opacity-80">
                <div className="relative w-full h-full">
                  <img src="/mascot.png" alt="Dental Professional" className="w-full h-full object-contain drop-shadow-lg transform -rotate-6" />
                  {/* Decorative lines/doodles */}
                  <svg className="absolute -top-10 -right-10 w-24 h-24 text-gray-400 opacity-50" viewBox="0 0 100 100">
                    <path d="M10,50 Q50,0 90,50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4,4" />
                  </svg>
                </div>
              </div>

              {/* Center Text */}
              <div className="text-center max-w-3xl mx-auto z-10 px-4">
                {/* Main Headline */}
                <h2 className="text-6xl md:text-7xl font-serif text-gray-900 mb-6 leading-tight">
                  We connect <br />
                  <span className="font-normal italic">professionals</span> and <br />
                  <span className="font-normal italic">families</span>
                </h2>

                {/* Subtitle */}
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Connecting dental professionals to schools, schools to students, and students to parents for a seamless oral health journey.
                </p>

                {/* CTA Button */}
                <div className="flex items-center justify-center space-x-4">
                  <Link href="/login">
                    <Button className="h-14 bg-primary hover:bg-primary/90 text-white px-10 rounded-full shadow-lg hover:shadow-primary/20 transition-all text-base font-semibold">
                      Sign up free
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="h-14 border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 rounded-full transition-all text-base font-bold bg-transparent">
                      Contact Us
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Decorative Illustration */}
              <div className="hidden lg:block w-64 h-64 opacity-80">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Abstract representation of connection */}
                  <div className="absolute top-0 right-10 w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                    <School className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="absolute bottom-10 left-0 w-24 h-24 bg-purple-50 rounded-3xl rotate-12 flex items-center justify-center border border-purple-100 shadow-sm">
                    <Users className="w-10 h-10 text-purple-600" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-100 shadow-sm">
                    <Heart className="w-6 h-6 text-green-600" />
                  </div>
                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full text-gray-300 -z-10" viewBox="0 0 200 200">
                    <path d="M50,150 Q100,100 150,50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                    <path d="M100,100 L150,150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="impact" className="py-24 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="font-serif text-3xl font-bold text-primary mb-4">Our Growing Impact</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">Making a measurable difference in communities across the nation.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Students Screened', value: '15,000+', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Schools Partnered', value: '200+', icon: School, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Dental Camps', value: '150+', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Families Reached', value: '5,000+', icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border border-border/50 text-center hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div className="text-4xl font-serif font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - Bento Grid */}
      <section id="schools" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-serif font-bold text-gray-900 mb-4">Why Partner With Us?</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive dental care programs creating value for everyone involved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Featured Card - For Schools */}
            <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-white rounded-[2.5rem] p-10 border border-blue-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <School className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-serif font-bold text-gray-900 mb-4">For Schools</h4>
              <p className="text-gray-600 leading-relaxed text-lg mb-8">
                Enhance your school's health profile with free dental screening camps, digital health records for every student, and comprehensive oral health education workshops.
              </p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {['Free Screenings', 'Digital Records', 'Health Workshops', 'Parent Reports'].map((item) => (
                  <li key={item} className="flex items-center text-gray-700 bg-white/50 rounded-lg px-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Side Card - For Parents */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-[2.5rem] p-10 border border-purple-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-serif font-bold text-gray-900 mb-4">For Parents</h4>
              <p className="text-gray-600 leading-relaxed mb-6">
                Detailed dental reports, expert recommendations, and ongoing support for your child's oral health journey right on your phone.
              </p>
              <Button variant="link" className="text-secondary p-0 font-semibold group-hover:translate-x-1 transition-transform">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Bottom Card - For Partners */}
            <div className="md:col-span-3 bg-gradient-to-br from-orange-50 to-white rounded-[2.5rem] p-10 border border-orange-100 shadow-sm hover:shadow-md transition-all group mt-2 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-2xl font-serif font-bold text-gray-900 mb-4">For CSR Partners</h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Make a lasting impact through CSR initiatives that improve children's health and create healthier communities. Track your impact in real-time.
                </p>
              </div>
              <div className="flex-1 w-full flex justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-500">Impact Score</span>
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-xs">+12% vs last month</span>
                  </div>
                  <div className="h-32 bg-orange-50 rounded-lg flex items-end justify-between p-4 gap-2">
                    {[40, 65, 45, 80, 55, 90].map((h, i) => (
                      <div key={i} className="w-full bg-orange-400 rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section id="partners" className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h3 className="text-4xl md:text-5xl font-serif font-bold mb-6">Ready to Make a Difference?</h3>
          <p className="text-xl text-white/90 mb-10 font-light">
            Join us in building a healthier future for India's children, one smile at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button className="h-14 bg-white text-primary hover:bg-gray-100 px-10 rounded-full shadow-lg transition-all text-base font-bold">
                Get Started Today
              </Button>
            </Link>
            <Button variant="outline" className="h-14 border-2 border-white text-white bg-transparent hover:bg-white hover:text-primary px-10 rounded-full transition-all text-base font-bold backdrop-blur-sm">
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                  <img src="/logo.png" alt="Smile Stars India Logo" className="w-full h-full object-cover" />
                </div>
                <h4 className="text-xl font-serif font-bold text-gray-900">Smyl Stars India</h4>
              </div>
              <p className="text-gray-500 leading-relaxed mb-6 max-w-sm">
                Safeguarding little smiles across India through preventive dental care and holistic health awareness programs.
              </p>
              <div className="flex space-x-4">
                {['twitter', 'facebook', 'instagram', 'linkedin'].map(social => (
                  <a key={social} href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                    <span className="sr-only">{social}</span>
                    <div className="w-4 h-4 bg-current rounded-sm"></div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h5 className="font-serif font-bold text-gray-900 mb-6">Quick Links</h5>
              <ul className="space-y-3 text-gray-500">
                {['Schools', 'Parents', 'Partners', 'Impact', 'Login'].map(item => (
                  <li key={item}><a href="#" className="hover:text-primary transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-serif font-bold text-gray-900 mb-6">Contact</h5>
              <div className="text-gray-500 space-y-3">
                <p>Email: info@smylstars.org</p>
                <p>Phone: +91-11-2345-6789</p>
                <p>New Delhi, India</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 Smyl Stars India. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}