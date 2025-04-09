
import React from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start py-2 px-4 text-base font-medium rounded-lg",
        active ? "bg-pastel-lavender text-vibrant-purple" : "hover:bg-pastel-lavender/50"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-vibrant-purple" />}
    </Button>
  );
};

const Sidebar = () => {
  return (
    <aside className="w-64 border-r h-screen p-4 hidden md:block">
      <div className="space-y-1">
        <SidebarItem 
          icon={<Gamepad className="h-5 w-5" />}
          label="Games" 
          active={true}
        />
        <SidebarItem 
          icon={<Users className="h-5 w-5" />}
          label="Friends" 
        />
        <SidebarItem 
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages" 
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-4">ACTIVE GAMES</h3>
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start py-2 px-4 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <span>Pixel Party (3/4)</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start py-2 px-4 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <span>Color Crush (2/2)</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start py-2 px-4 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2" />
            <span>Pastel Quest (1/4)</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-4">ONLINE FRIENDS</h3>
        <div className="space-y-1 px-4">
          <div className="flex items-center py-2">
            <div className="relative mr-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/placeholder.svg" alt="Friend" />
                <AvatarFallback className="bg-pastel-pink text-vibrant-pink text-xs">JD</AvatarFallback>
              </Avatar>
              <span className="badge-online w-2 h-2"></span>
            </div>
            <span className="text-sm">Jane Doe</span>
          </div>
          <div className="flex items-center py-2">
            <div className="relative mr-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/placeholder.svg" alt="Friend" />
                <AvatarFallback className="bg-pastel-mint text-green-600 text-xs">MS</AvatarFallback>
              </Avatar>
              <span className="badge-online w-2 h-2"></span>
            </div>
            <span className="text-sm">Max Smith</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
