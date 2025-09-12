import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Users, MapPin, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green to-poker-green-dark">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-poker-gold rounded-full flex items-center justify-center">
              <span className="text-poker-green font-bold text-lg">♠</span>
            </div>
            <h1 className="text-2xl font-bold text-white">DeepStack</h1>
          </div>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Find Your Game
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover poker rooms, join waitlists, and see where your friends are playing. 
            The action is happening all around town.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-poker-gold text-poker-green hover:bg-poker-gold/90">
              <Phone className="w-5 h-5 mr-2" />
              Sign Up with Phone
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Browse Rooms
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-poker-gold/20 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-poker-gold" />
              </div>
              <CardTitle>Find Rooms</CardTitle>
              <CardDescription className="text-white/70">
                Discover poker rooms near you with live game information and waitlist status.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-poker-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-poker-gold" />
              </div>
              <CardTitle>Join Waitlists</CardTitle>
              <CardDescription className="text-white/70">
                Get on waitlists instantly and receive notifications when your seat is ready.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <div className="w-12 h-12 bg-poker-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-poker-gold" />
              </div>
              <CardTitle>Connect with Friends</CardTitle>
              <CardDescription className="text-white/70">
                See where your friends are playing and join them at the tables.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Live Activity Section */}
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Live Activity</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/70">Live</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sample Activity Cards */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-poker-gold rounded-full flex items-center justify-center">
                    <span className="text-poker-green font-bold">JD</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">John Doe</p>
                    <p className="text-white/60 text-sm">Playing at The Card Room</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-poker-gold rounded-full flex items-center justify-center">
                    <span className="text-poker-green font-bold">AS</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Alice Smith</p>
                    <p className="text-white/60 text-sm">On waitlist at High Stakes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-poker-gold rounded-full flex items-center justify-center">
                    <span className="text-poker-green font-bold">MJ</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Mike Johnson</p>
                    <p className="text-white/60 text-sm">Playing at Lucky&apos;s Casino</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-poker-gold rounded-full flex items-center justify-center">
                    <span className="text-poker-green font-bold">SB</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Sarah Brown</p>
                    <p className="text-white/60 text-sm">Tournament at The Palace</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center text-white/60">
          <p>&copy; 2024 DeepStack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
