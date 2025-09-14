'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, MapPin, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className='container mx-auto px-4 py-12'>
        <div className='text-center mb-16'>
          <div className='mb-16'>
            <h1 className='font-bold text-foreground mb-8'>
              <span className='text-4xl md:text-5xl block mb-4'>Join</span>
              <span className='text-6xl md:text-7xl'>DeepStack.</span>
              <span className='text-2xl md:text-3xl'>club</span>
            </h1>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto mb-12'>
              Discover poker rooms, join waitlists, and see where your friends
              are playing.
            </p>
          </div>
          <div className='flex justify-center'>
            <Button
              size='lg'
              className='text-lg px-8 py-3'
            >
              Browse Rooms
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className='grid md:grid-cols-3 gap-8 mb-16'>
          <Card className='hover:shadow-none hover:cursor-default'>
            <CardHeader>
              <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                <MapPin className='w-6 h-6 text-primary' />
              </div>
              <CardTitle>Find Rooms</CardTitle>
              <CardDescription>
                Discover poker rooms near you with live game information and
                waitlist status.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className='hover:shadow-none hover:cursor-default'>
            <CardHeader>
              <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                <Clock className='w-6 h-6 text-primary' />
              </div>
              <CardTitle>Join Waitlists</CardTitle>
              <CardDescription>
                Get on waitlists instantly and receive notifications when your
                seat is ready.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className='hover:shadow-none hover:cursor-default'>
            <CardHeader>
              <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                <Users className='w-6 h-6 text-primary' />
              </div>
              <CardTitle>Connect with Friends</CardTitle>
              <CardDescription>
                See where your friends are playing and join them at the tables.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
