
import React from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad, MessageSquare, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MobileNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden flex justify-around p-2 z-10">
      <Button variant="ghost" className="flex flex-col items-center py-2">
        <Gamepad className="h-6 w-6" />
        <span className="text-xs mt-1">Games</span>
      </Button>
      
      <Button variant="ghost" className="flex flex-col items-center py-2">
        <Users className="h-6 w-6" />
        <span className="text-xs mt-1">Friends</span>
      </Button>
      
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="flex flex-col items-center py-2">
            <div className="relative">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-vibrant-pink text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </div>
            <span className="text-xs mt-1">Chat</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col h-[80vh]">
          <div className="px-4 py-3 border-b">
            <h2 className="text-lg font-bold">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-pastel-blue/20 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg" alt="Jane Doe" />
                  <AvatarFallback className="bg-pastel-pink text-vibrant-pink">JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Jane Doe</p>
                  <p className="text-xs text-muted-foreground">Ready for the next game?</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-pastel-blue/20 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg" alt="Max Smith" />
                  <AvatarFallback className="bg-pastel-mint text-green-600">MS</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Max Smith</p>
                  <p className="text-xs text-muted-foreground">Let's play one more round!</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-pastel-blue/20 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg" alt="Alex King" />
                  <AvatarFallback className="bg-pastel-yellow text-orange-600">AK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Alex King</p>
                  <p className="text-xs text-muted-foreground">Great game yesterday!</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
