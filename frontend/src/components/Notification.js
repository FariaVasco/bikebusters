import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const Notification = ({ message, onYes, onNo, onClose }) => {
  const handleNo = () => {
    onNo();
    onClose();
  };

  const handleYes = () => {
    onYes();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 right-4 z-50"
    >
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex justify-between items-center">
            New Update Available
            <Button variant="ghost" size="sm" onClick={handleNo} className="p-0 h-auto">
              <X size={20} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{message}</p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleNo}>
            Cancel route
          </Button>
          <Button variant="default" size="sm" onClick={handleYes}>
            Update route
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default Notification;