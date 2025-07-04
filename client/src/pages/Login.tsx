import { Link } from 'wouter';
import { Smile, School, Heart, UserCog, Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <Smile className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Smile Stars India
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Dental Care Platform
          </p>
        </div>

        {/* User Type Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/school-login" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">School Portal</h3>
                <p className="text-sm text-gray-600">Register your school and coordinate dental camps</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/parent-login" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-pink-500">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Parent Portal</h3>
                <p className="text-sm text-gray-600">Access your child's dental reports and track progress</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin-login" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCog className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Portal</h3>
                <p className="text-sm text-gray-600">System administration and camp management</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dentist-login" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dentist Portal</h3>
                <p className="text-sm text-gray-600">Conduct dental screenings and generate reports</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}