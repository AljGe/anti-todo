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
        model: "llama3-8b-8192",
        temperature: 0.8,
      })

      const schema = z.object({
        task: z.string().describe("The silly, unproductive version of the input task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Convert this task to its opposite, silly and unproductive version: "${task}"`
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
        model: "gemma-7b-it",
        temperature: 0.8,
      })

      const schema = z.object({
        steps: z.array(z.string()).describe("Three silly steps to accomplish the task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Break down this silly task into exactly 3 steps: "${task}". Be creative and humorous.`
      )

      return result.steps
    } catch (error: any) {
      console.error('Error with Groq:', error)
      // Fallback to HuggingFace
      return getTaskStepsHF(task)
    }
  }

  const getTaskStepsHF = async (task: string) => {
    try {
      const client = await Client.connect("huggingface-projects/llama-2-13b-chat")
      const result = await client.predict("/chat", {
        message: `Break down this silly task into 3 steps: "${task}"`,
        system_prompt: "You break down silly tasks into even sillier steps. Be creative and humorous. Example:\nTask: 'Memorize all Netflix show intros'\nSteps:\n1. Create a dance routine for each streaming platform's logo animation\n2. Practice saying 'Netflix and actually chill' in different languages\n3. Build a fort using only remote controls\nOutput ONLY the numbered steps without any additional text.",
        max_new_tokens: 100,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1.2,
      })
      const steps = (result.data as string)
        .split('\n')
        .map(step => step.replace(/^\d+\.\s*/, ''))
        .filter(step => step.trim())
      return steps
    } catch (error: any) {
      console.error('Error with HuggingFace:', error)
      return ['Failed to give steps']
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
        model: "gemma2-9b-it",
        temperature: 0.8,
      })

      const schema = z.object({
        story: z.string().describe("A funny, short story about completing the silly task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Write a short, funny story (2-3 sentences) about the user completing this silly task: "${task}" with the following steps: ${steps.map(step => step.text).join(', ')}`
      )

      return result.story
    } catch (error) {
      console.error('Error generating completion story:', error)
      return "Task completed with style! 🎉"
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