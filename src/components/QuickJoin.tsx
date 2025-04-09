
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Avatar from '@/components/Avatar';

const QuickJoin = () => {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Join</CardTitle>
        <CardDescription>Friends playing now</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar fallback="JD" status="online" size="sm" />
              <div>
                <p className="text-sm font-medium">Jane Doe</p>
                <p className="text-xs text-muted-foreground">Pixel Party</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8">Join</Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar fallback="MS" status="online" size="sm" />
              <div>
                <p className="text-sm font-medium">Max Smith</p>
                <p className="text-xs text-muted-foreground">Color Crush</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8">Join</Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar fallback="AK" status="away" size="sm" />
              <div>
                <p className="text-sm font-medium">Alex King</p>
                <p className="text-xs text-muted-foreground">Pastel Quest</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8">Join</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickJoin;
