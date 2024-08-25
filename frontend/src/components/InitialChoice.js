import React from 'react';
import { motion } from 'framer-motion';
import { Bike, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from "../lib/utils";

const InitialChoice = ({ onChoiceSelected }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full"
      >
        <h2 className="text-4xl font-bold text-center mb-8 text-gray-800">Welcome to BikeBusters</h2>
        <div className="space-y-6">
          <Button
            onClick={() => onChoiceSelected('report')}
            className={cn(
              "w-full py-4 bg-red-500 hover:bg-red-600 transition-colors duration-200",
              "flex items-center justify-center text-lg"
            )}
          >
            <AlertTriangle className="mr-2" size={24} />
            Report a Stolen Bike
          </Button>
          <Button
            onClick={() => onChoiceSelected('login')}
            className={cn(
              "w-full py-4 bg-green-500 hover:bg-green-600 transition-colors duration-200",
              "flex items-center justify-center text-lg"
            )}
          >
            <LogIn className="mr-2" size={24} />
            Login / Register
          </Button>
        </div>
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Bike className="inline-block text-blue-500 mb-4" size={64} />
          <p className="text-lg text-gray-600">Help us track down stolen bikes and make our community safer!</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InitialChoice;