import { Link } from 'wouter';
import { Smile, School, Heart, UserCog, Stethoscope, CheckCircle, Users, MapPin, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Login() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <Smile className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smile Stars India</h1>
                <p className="text-sm text-gray-600">Dental Care Platform</p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Access Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Preventive Dental Care & Awareness Camps
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Enhancing Community Health through Comprehensive Dental Outreach in Indian Schools
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Heart className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Health</span>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <School className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Education</span>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Prevention</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-lg shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Access Your Portal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/school-login" className="block">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <School className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900">School Portal</h4>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/parent-login" className="block">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-pink-500">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Heart className="w-6 h-6 text-pink-600" />
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900">Parent Portal</h4>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/admin-login" className="block">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <UserCog className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900">Admin Portal</h4>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="/dentist-login" className="block">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Stethoscope className="w-6 h-6 text-purple-600" />
                        </div>
                        <h4 className="font-semibold text-sm text-gray-900">Dentist Portal</h4>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem-Solution Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* The Challenge */}
            <div className="bg-red-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-red-800 mb-4">The Challenge</h3>
              <p className="text-red-700 leading-relaxed">
                In rural and urban India, the lack of regular dental checkups and preventive oral healthcare knowledge presents a significant public health challenge. This situation leads to a higher prevalence of dental diseases and poor oral hygiene practices among school children.
              </p>
            </div>

            {/* The Solution */}
            <div className="bg-blue-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">The Solution</h3>
              <p className="text-blue-700 leading-relaxed">
                Smile Stars India's Dental Screening & Awareness Camps are strategically developed to address these oral healthcare deficiencies. These camps provide essential dental screenings, conducted by qualified dental professionals, with comprehensive digital health records and parent communication.
              </p>
            </div>

            {/* The Impact */}
            <div className="bg-green-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-green-800 mb-4">The Lasting Impact</h3>
              <p className="text-green-700 leading-relaxed">
                The enduring impact of these camps is the cultivation of oral health-aware communities. By facilitating access to essential dental services and imparting oral health education, we are empowering families to proactively manage their children's dental health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Impact</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-4xl font-bold text-blue-600 mb-2">15,000+</div>
              <div className="text-gray-600">Students Screened</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-4xl font-bold text-green-600 mb-2">200+</div>
              <div className="text-gray-600">Schools Partnered</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-4xl font-bold text-purple-600 mb-2">150+</div>
              <div className="text-gray-600">Dental Camps</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <div className="text-4xl font-bold text-pink-600 mb-2">5,000+</div>
              <div className="text-gray-600">Families Reached</div>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Focus */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Regional Focus</h3>
              <h4 className="text-xl font-semibold text-gray-700 mb-8">Regions Where We Operate</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Maharashtra</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Gujarat</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Karnataka</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Tamil Nadu</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Rajasthan</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Uttar Pradesh</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Madhya Pradesh</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">West Bengal</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-8">
              <div className="aspect-square bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                  <h4 className="text-2xl font-bold text-gray-900">8 States</h4>
                  <p className="text-gray-600">Pan-India Coverage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">Join Our Initiative</h3>
          <p className="text-xl text-blue-100 mb-8">
            Your support for dental health awareness can significantly contribute to improving the oral health outcomes of children across India. Join us in this vital healthcare initiative.
          </p>
          <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
            Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                  <Smile className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-bold">Smile Stars India</h4>
              </div>
              <p className="text-gray-300 mb-4">
                An organization dedicated to empowering children through dental health awareness and preventive care programs in Indian schools.
              </p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/school-login" className="hover:text-white">School Portal</Link></li>
                <li><Link href="/parent-login" className="hover:text-white">Parent Portal</Link></li>
                <li><Link href="/dentist-login" className="hover:text-white">Dentist Portal</Link></li>
                <li><Link href="/admin-login" className="hover:text-white">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Contact</h5>
              <div className="text-gray-300 space-y-2">
                <p>Email: info@smilestars.org</p>
                <p>Phone: +91-11-2345-6789</p>
                <p>New Delhi, India</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">© 2025 Smile Stars India. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}