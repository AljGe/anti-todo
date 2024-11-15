import { useState } from 'react'
import { ChatGroq } from "@langchain/groq"
import { Client } from "@gradio/client"
import { z } from "zod"
import './App.css'

function App() {
  const [todos, setTodos] = useState<Array<{
    task: string;
    steps: Array<{ text: string; completed: boolean }>;
    hasSteps: boolean;
    completionStory?: string;
  }>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getUnproductiveVersionGroq = async (task: string) => {
    try {
      const model = new ChatGroq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        model: "llama-3.1-70b-versatile",
        temperature: 0.9,
      })

      const schema = z.object({
        task: z.string().describe("A silly version of the input task that does the opposite of being productive"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Convert this productive task into a ridiculous, counterproductive version: "${task}"`
      )

      return result.task
    } catch (error: any) {
      console.error('Error with Groq:', error)
      // Fallback to HuggingFace
      return getUnproductiveVersionHF(task)
    }
  }

  const getUnproductiveVersionHF = async (task: string) => {
    try {
      const client = await Client.connect("huggingface-projects/llama-2-13b-chat")
      const result = await client.predict("/chat", {
        message: `Convert to anti-task: "${task}"`,
        system_prompt: "You convert tasks to their opposite, silly and unproductive versions. Respond ONLY with the converted task, without any additional text or explanations. Example:\nInput: 'Study for math test'\nOutput: 'Calculate how many pizza slices you can eat in one sitting'",
        max_new_tokens: 20,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1.2,
      })
      return result.data as string
    } catch (error: any) {
      console.error('Error with HuggingFace:', error)
      return 'Failed to generate anti-task. Please try again later.'
    }
  }

  const getTaskStepsGroq = async (task: string) => {
    try {
      const model = new ChatGroq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        model: "mixtral-8x7b-32768",
        temperature: 0.9,
      })

      const response = await model.invoke(
        `Generate exactly 3 detailed steps for this task: "${task}". Each step should be a little bit weird. Make each step a complete sentence.`
      )
      
      const content = typeof response.content === 'string' 
        ? response.content 
        : Array.isArray(response.content) 
          ? response.content.map(item => {
              if (typeof item === 'string') return item;
              if ('text' in item) return item.text;
              return '';
            }).join('\n')
          : '';
      
      const steps = content
        .split('\n')
        .filter((step: string) => step.trim())
        .slice(0, 3)
      
      return steps
    } catch (error: any) {
      console.error('Error with Groq:', error)
      return getTaskStepsHF(task)
    }
  }

  const getTaskStepsHF = async (task: string) => {
    try {
      const client = await Client.connect("huggingface-projects/llama-2-13b-chat")
      const result = await client.predict("/chat", {
        message: `Break down this silly task into 3 steps: "${task}"`,
        system_prompt: "You break down silly tasks into exactly 3 silly steps. Be creative and humorous. Respond with exactly 3 numbered steps.",
        max_new_tokens: 100,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1.2,
      })

      if (!result || typeof result.data !== 'string') {
        throw new Error('Invalid response format from HuggingFace')
      }

      const steps = result.data
        .split('\n')
        .map((step: string) => step.replace(/^\d+\.\s*/, ''))
        .filter((step: string) => step.trim())
        .slice(0, 3)

      return steps.length === 3 ? steps : ['Step 1', 'Step 2', 'Step 3']
    } catch (error: any) {
      console.error('Error with HuggingFace:', error)
      return ['Step 1', 'Step 2', 'Step 3']
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setIsLoading(true)
      const unproductiveTask = await getUnproductiveVersionGroq(inputValue)
      setTodos([...todos, { task: unproductiveTask, steps: [], hasSteps: false }])
      setInputValue('')
      setIsLoading(false)
    }
  }

  const handleGenerateSteps = async (index: number) => {
    const todo = todos[index]
    if (!todo.hasSteps) {
      setIsLoading(true)
      const steps = await getTaskStepsGroq(todo.task)
      const updatedTodos = todos.map((t, i) => 
        i === index ? {
          ...t,
          steps: steps.map(step => ({ text: step, completed: false })),
          hasSteps: true
        } : t
      )
      setTodos(updatedTodos)
      setIsLoading(false)
    }
  }

  const handleDelete = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index))
  }

  const generateCompletionStory = async (task: string, steps: Array<{ text: string; completed: boolean }>) => {
    try {
      const model = new ChatGroq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        model: "llama3-70b-8192",
        temperature: 0.8,
      })

      const schema = z.object({
        story: z.string().describe("An epic story about completing the task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Write a story (3-4 sentences) about the user completing this task. Include dramatic tension and a triumphant ending. Always praise the user for their successful completion of the very hard task. Adress the user as 'you'. Task: "${task}" with steps: ${steps.map(step => step.text).join(', ')}. Make it feel like an adventure movie!`
      )

      return result.story
    } catch (error) {
      console.error('Error generating completion story:', error)
      return "An epic tale of procrastination and triumph! 🎉"
    }
  }

  const handleStepComplete = async (todoIndex: number, stepIndex: number) => {
    const updatedTodos = [...todos]
    const todo = updatedTodos[todoIndex]
    todo.steps[stepIndex].completed = !todo.steps[stepIndex].completed

    // Check if all steps are completed
    const allCompleted = todo.steps.every(step => step.completed)
    if (allCompleted && !todo.completionStory) {
      const story = await generateCompletionStory(todo.task, todo.steps)
      todo.completionStory = story
    } else if (!allCompleted) {
      todo.completionStory = undefined
    }

    setTodos(updatedTodos)
  }

  return (
    <div className="app-container">
      <h1>Anti-Todo List</h1>
      <p>Give me your productive tasks!</p>
      
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder='Study for final exam'
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding productive task to list...' : 'Add Task'}
        </button>
      </form>

      <ul className="todo-list">
        {todos.map((todo, index) => (
          <li key={index} className="todo-item">
            <div className="task-main">
              {todo.task}
              <div className="task-buttons">
                {!todo.hasSteps && (
                  <button 
                    onClick={() => handleGenerateSteps(index)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Giving steps...' : 'Give Steps'}
                  </button>
                )}
                <button onClick={() => handleDelete(index)}>Delete</button>
              </div>
            </div>
            {todo.hasSteps && (
              <ul className="task-steps">
                {todo.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="step-item">
                    <input
                      type="checkbox"
                      className="step-checkbox"
                      checked={step.completed}
                      onChange={() => handleStepComplete(index, stepIndex)}
                    />
                    <span className={`step-text ${step.completed ? 'completed' : ''}`}>
                      {step.text}
                    </span>
                  </li>
                ))}
                {todo.completionStory && (
                  <div className="completion-story">
                    {todo.completionStory}
                  </div>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App