import { useState } from 'react'
import { Client } from "@gradio/client"
import './App.css'

function App() {
  const [todos, setTodos] = useState<Array<{ task: string; steps: string[]; hasSteps: boolean }>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getUnproductiveVersion = async (task: string) => {
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
      console.error('Error generating task:', error)
      if (error?.message?.includes('exceeded your GPU quota')) {
        return 'The Tasker is taking a break! Please wait a minute before trying again.'
      }
      return 'Failed to generate anti-task. Please try again later.'
    }
  }

  const getTaskSteps = async (task: string) => {
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
      console.error('Error giving steps:', error)
      if (error?.message?.includes('exceeded your GPU quota')) {
        return ['The Tasker is taking a break! Please wait a few minutes or up to one hour before trying again.']
      }
      return ['Failed to give steps']
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setIsLoading(true)
      const unproductiveTask = await getUnproductiveVersion(inputValue)
      setTodos([...todos, { task: unproductiveTask, steps: [], hasSteps: false }])
      setInputValue('')
      setIsLoading(false)
    }
  }

  const handleGenerateSteps = async (index: number) => {
    const todo = todos[index]
    if (!todo.hasSteps) {
      setIsLoading(true)
      const steps = await getTaskSteps(todo.task)
      const updatedTodos = todos.map((t, i) => 
        i === index ? { ...t, steps, hasSteps: true } : t
      )
      setTodos(updatedTodos)
      setIsLoading(false)
    }
  }

  const handleDelete = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index))
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
                  <li key={stepIndex}>{step}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App