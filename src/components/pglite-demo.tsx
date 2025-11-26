import { useState, useEffect } from 'react'
import { usePGlite } from '@/lib/pglite'
import { Button } from '@/components/ui/button'

interface Todo {
    id: number
    task: string
    completed: boolean
}

export function PGliteDemo() {
    const { db, isReady, error } = usePGlite()
    const [todos, setTodos] = useState<Todo[]>([])
    const [newTask, setNewTask] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isReady && db) {
            initializeTable()
        }
    }, [isReady, db])

    const initializeTable = async () => {
        if (!db) return

        try {
            // Create table if it doesn't exist
            await db.exec(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          task TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE
        );
      `)

            // Load existing todos
            await loadTodos()
        } catch (error) {
            console.error('Error initializing table:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadTodos = async () => {
        if (!db) return

        try {
            const result = await db.query<Todo>('SELECT * FROM todos ORDER BY id DESC')
            setTodos(result.rows)
        } catch (error) {
            console.error('Error loading todos:', error)
        }
    }

    const addTodo = async () => {
        if (!db || !newTask.trim()) return

        try {
            await db.query(
                'INSERT INTO todos (task, completed) VALUES ($1, $2)',
                [newTask, false]
            )
            setNewTask('')
            await loadTodos()
        } catch (error) {
            console.error('Error adding todo:', error)
        }
    }

    const toggleTodo = async (id: number) => {
        if (!db) return

        try {
            await db.query(
                'UPDATE todos SET completed = NOT completed WHERE id = $1',
                [id]
            )
            await loadTodos()
        } catch (error) {
            console.error('Error toggling todo:', error)
        }
    }

    const deleteTodo = async (id: number) => {
        if (!db) return

        try {
            await db.query('DELETE FROM todos WHERE id = $1', [id])
            await loadTodos()
        } catch (error) {
            console.error('Error deleting todo:', error)
        }
    }

    if (error) {
        return (
            <div className="w-full max-w-md rounded-lg border border-destructive bg-card p-6 text-card-foreground shadow-sm">
                <p className="text-center text-destructive">Error initializing PGlite: {error.message}</p>
            </div>
        )
    }

    if (!isReady || loading) {
        return (
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                <p className="text-center text-muted-foreground">Loading PGlite...</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">PGlite Todo Demo</h2>

            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    placeholder="Enter a new task..."
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button onClick={addTodo}>Add</Button>
            </div>

            <div className="space-y-2">
                {todos.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No todos yet. Add one above!</p>
                ) : (
                    todos.map((todo) => (
                        <div
                            key={todo.id}
                            className="flex items-center gap-2 rounded-md border border-border bg-background p-3"
                        >
                            <input
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => toggleTodo(todo.id)}
                                className="h-4 w-4 cursor-pointer"
                            />
                            <span
                                className={`flex-1 ${todo.completed ? 'text-muted-foreground line-through' : ''
                                    }`}
                            >
                                {todo.task}
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteTodo(todo.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    ))
                )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
                ✓ Data persisted in IndexedDB via PGlite
            </p>
        </div>
    )
}

