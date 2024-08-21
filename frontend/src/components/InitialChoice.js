import React from 'react';
import { motion } from 'framer-motion';
import { Bike, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from "../lib/utils";

const InitialChoice = ({ onChoiceSelected }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome to BikeBusters</h2>
        <div className="space-y-4">
          <Button
            onClick={() => onChoiceSelected('report')}
            className={cn(
              "w-full py-3 bg-red-500 hover:bg-red-600 transition-colors duration-200",
              "flex items-center justify-center"
            )}
          >
            <AlertTriangle className="mr-2" />
            Report a Stolen Bike
          </Button>
          <Button
            onClick={() => onChoiceSelected('login')}
            className={cn(
              "w-full py-3 bg-green-500 hover:bg-green-600 transition-colors duration-200",
              "flex items-center justify-center"
            )}
          >
            <LogIn className="mr-2" />
            Login / Register
          </Button>
        </div>
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Bike className="inline-block text-blue-500 mb-2" size={48} />
          <p className="text-sm text-gray-600">Help us track down stolen bikes and make our community safer!</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InitialChoice;