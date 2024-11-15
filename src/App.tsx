import { useState, useEffect } from 'react'
import { ChatGroq } from "@langchain/groq"
import { z } from "zod"
import './App.css'
import { toast } from 'react-hot-toast'
import { debounce } from 'lodash'

function App() {
  const [todos, setTodos] = useState<Array<{
    task: string;
    steps: Array<{ text: string; completed: boolean }>;
    hasSteps: boolean;
    completionStory?: string;
  }>>([])
  const [inputValue, setInputValue] = useState('')
  const [loadingStates, setLoadingStates] = useState<{
    submission: boolean;
    steps: Record<number, boolean>;
  }>({
    submission: false,
    steps: {},
  })

  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('GROQ API key is required')
  }

  const getUnproductiveVersionGroq = async (task: string) => {
    try {
      const model = new ChatGroq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY,
        model: "llama3-70b-8192",
        temperature: 0.8,
      })

      const schema = z.object({
        task: z.string().describe("A darkly humorous, unproductive version of the task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Convert this task into a darkly humorous, unproductive version. Think chaotic neutral energy, but avoid direct harm to living beings: "${task}"`
      )

      return result.task
    } catch (error: any) {
      console.error('Error with Groq:', error)
      toast.error('Failed to generate anti-task. Please try again.')
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
        `Generate exactly 3 steps for this task: "${task}". Each step should be a little bit weird. Make each step a complete sentence.`
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
      return ['Failed to generate steps. Please try again.', 'Step 2', 'Step 3']
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = inputValue.trim()
    if (trimmedInput.length < 3) {
      toast.error('Please enter a longer task description')
      return
    }
    if (trimmedInput) {
      setLoadingStates(prev => ({ ...prev, submission: true }))
      const unproductiveTask = await getUnproductiveVersionGroq(trimmedInput)
      setTodos([...todos, { task: unproductiveTask, steps: [], hasSteps: false }])
      setInputValue('')
      setLoadingStates(prev => ({ ...prev, submission: false }))
    }
  }

  const handleGenerateSteps = async (index: number) => {
    const todo = todos[index]
    if (!todo.hasSteps) {
      setLoadingStates(prev => ({ ...prev, steps: { ...prev.steps, [index]: true } }))
      const steps = await getTaskStepsGroq(todo.task)
      const updatedTodos = todos.map((t, i) => 
        i === index ? {
          ...t,
          steps: steps.map(step => ({ text: step, completed: false })),
          hasSteps: true
        } : t
      )
      setTodos(updatedTodos)
      setLoadingStates(prev => ({ ...prev, steps: { ...prev.steps, [index]: false } }))
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
        story: z.string().describe("A darkly humorous story about completing the task"),
      })

      const structuredModel = model.withStructuredOutput(schema)
      const result = await structuredModel.invoke(
        `Write a darkly humorous story (3-4 sentences) about completing this ridiculous task. Include dramatic flair and comedic elements, but avoid anything involving harm to living beings. Address the user as 'you'. Task: "${task}" with steps: ${steps.map(step => step.text).join(', ')}. Make it feel like a comedic villain's monologue!`
      )

      return result.story
    } catch (error) {
      console.error('Error generating completion story:', error)
      return "Your villainous scheme was a spectacular success! 🦹‍♂️"
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

  const debouncedGenerateSteps = debounce(handleGenerateSteps, 1000)

  useEffect(() => {
    const savedTodos = localStorage.getItem('anti-todos')
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('anti-todos', JSON.stringify(todos))
  }, [todos])

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
          disabled={loadingStates.submission}
        />
        <button 
          type="submit" 
          disabled={loadingStates.submission}
          aria-busy={loadingStates.submission}
          aria-label="Add new task"
        >
          {loadingStates.submission ? 'Adding productive task to list...' : 'Add Task'}
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
                    onClick={() => debouncedGenerateSteps(index)}
                    disabled={loadingStates.steps[index]}
                  >
                    {loadingStates.steps[index] ? 'Giving steps...' : 'Give Steps'}
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