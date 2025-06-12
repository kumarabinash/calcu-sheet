"use client";

import { useState, useEffect } from "react";
import { format, create, all } from "mathjs";

// Create a custom math instance with all functions
const math = create(all);

export default function Home() {
  const [calculations, setCalculations] = useState([
    { id: 1, text: "x = 10" },
    { id: 2, text: "y = 15" },
    { id: 3, text: "z = x + y" },
  ]);

  const [solutions, setSolutions] = useState<string[]>([]);
  const [, setScope] = useState<Record<string, any>>({});

  const parseExpression = (expression: string, currentScope: Record<string, any>): string => {
    try {
      // Remove any extra spaces and convert to lowercase
      const cleanExpr = expression.toLowerCase().trim();
      
      // Check for variable assignment (x = value)
      const assignmentMatch = cleanExpr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (assignmentMatch) {
        const [_, variable, value] = assignmentMatch;
        try {
          // Evaluate the right side of the assignment
          const result = math.evaluate(value, currentScope);
          return `${variable} = ${format(result, { precision: 14 })}`;
        } catch (error) {
          return "Invalid assignment";
        }
      }

      // Handle percentage expressions
      const percentagePatterns = [
        // X% of Y
        {
          regex: /^(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)$/,
          evaluate: (matches: RegExpMatchArray) => {
            const percentage = parseFloat(matches[1]);
            const number = parseFloat(matches[2]);
            return (percentage / 100) * number;
          }
        },
        // X + Y%
        {
          regex: /^(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)%$/,
          evaluate: (matches: RegExpMatchArray) => {
            const number = parseFloat(matches[1]);
            const percentage = parseFloat(matches[2]);
            return number + (number * percentage / 100);
          }
        },
        // X - Y%
        {
          regex: /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)%$/,
          evaluate: (matches: RegExpMatchArray) => {
            const number = parseFloat(matches[1]);
            const percentage = parseFloat(matches[2]);
            return number - (number * percentage / 100);
          }
        },
        // Y% off X
        {
          regex: /^(\d+(?:\.\d+)?)%\s+off\s+(\d+(?:\.\d+)?)$/,
          evaluate: (matches: RegExpMatchArray) => {
            const percentage = parseFloat(matches[1]);
            const number = parseFloat(matches[2]);
            return number - (number * percentage / 100);
          }
        }
      ];

      // Try percentage patterns first
      for (const pattern of percentagePatterns) {
        const matches = cleanExpr.match(pattern.regex);
        if (matches) {
          const result = pattern.evaluate(matches);
          return format(result, { precision: 14 });
        }
      }

      // If no percentage pattern matches, try mathjs evaluation with scope
      const result = math.evaluate(cleanExpr, currentScope);
      return format(result, { precision: 14 });
    } catch (error) {
      return "Invalid expression";
    }
  };

  useEffect(() => {
    // First pass: evaluate all expressions and collect variable assignments
    const newScope: Record<string, any> = {};
    const newSolutions: string[] = [];

    calculations.forEach(calc => {
      const cleanExpr = calc.text.toLowerCase().trim();
      const assignmentMatch = cleanExpr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      
      if (assignmentMatch) {
        const [_, variable, value] = assignmentMatch;
        try {
          const result = math.evaluate(value, newScope);
          newScope[variable] = result;
          newSolutions.push(`${variable} = ${format(result, { precision: 14 })}`);
        } catch (error) {
          newSolutions.push("Invalid assignment");
        }
      } else {
        newSolutions.push(parseExpression(calc.text, newScope));
      }
    });

    setScope(newScope);
    setSolutions(newSolutions);
  }, [calculations]);

  const handleCalculationChange = (id: number, newText: string) => {
    setCalculations(calculations.map(calc => 
      calc.id === id ? { ...calc, text: newText } : calc
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
    const currentIndex = calculations.findIndex(calc => calc.id === id);
    const currentCalc = calculations[currentIndex];

    if (e.key === 'Enter') {
      e.preventDefault();
      const newCalculation = {
        id: Math.max(...calculations.map(c => c.id)) + 1,
        text: ""
      };
      
      const newCalculations = [...calculations];
      newCalculations.splice(currentIndex + 1, 0, newCalculation);
      setCalculations(newCalculations);

      // Focus the new input after a short delay to ensure it's rendered
      setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        inputs[currentIndex + 1]?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && currentCalc.text === '' && calculations.length > 1) {
      e.preventDefault();
      const newCalculations = calculations.filter(calc => calc.id !== id);
      setCalculations(newCalculations);

      // Focus the previous input after deletion
      setTimeout(() => {
        const inputs = document.querySelectorAll('input');
        const prevIndex = Math.max(0, currentIndex - 1);
        inputs[prevIndex]?.focus();
      }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-6xl mx-auto p-4">
          <h1 className="text-2xl font-bold">Calculation Sheet</h1>
        </div>
      </div>

      <div className="pt-20 pb-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4">
            {/* Left side - Calculations (3/4 width) */}
            <div className="col-span-3 bg-white rounded-lg shadow-lg">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Calculations</h2>
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {calculations.map((calc) => (
                    <div key={calc.id} className="border-b pb-4">
                      <input
                        type="text"
                        value={calc.text}
                        onChange={(e) => handleCalculationChange(calc.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, calc.id)}
                        className="w-full text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                        placeholder="Enter calculation (e.g., x = 10, y = x + 5)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Solutions (1/4 width) */}
            <div className="col-span-1 bg-white rounded-lg shadow-lg">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Solutions</h2>
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {solutions.map((solution, index) => (
                    <div key={index} className="border-b pb-4">
                      <p className="text-gray-700">{solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
