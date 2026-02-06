import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000`;

const statusOptions = ["Pending", "In Progress", "Completed", "Blocked"];
const priorityOptions = ["Low", "Medium", "High", "Urgent"];

function useFetchCollection(endpoint) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const response = await fetch(`${API_BASE}${endpoint}`);
    const payload = await response.json();
    setData(payload);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [endpoint]);

  return { data, loading, refresh };
}

export default function App() {
  const [tab, setTab] = useState("tasks");
  const [metrics, setMetrics] = useState(null);
  const tasksState = useFetchCollection("/tasks");
  const membersState = useFetchCollection("/team-members");
  const projectsState = useFetchCollection("/projects");
  const activityState = useFetchCollection("/activity");

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    due_date: "",
    reminder_date: "",
    assignee_id: "",
    project_id: "",
    comments: "",
  });

  const [memberForm, setMemberForm] = useState({ name: "", role: "", email: "" });
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "Active",
  });

  const [filter, setFilter] = useState({
    assignee_id: "",
    project_id: "",
    status: "",
    priority: "",
    search: "",
  });

  const filteredTasks = useMemo(() => {
    return tasksState.data
      .filter((task) => (filter.assignee_id ? task.assignee_id === filter.assignee_id : true))
      .filter((task) => (filter.project_id ? task.project_id === filter.project_id : true))
      .filter((task) => (filter.status ? task.status === filter.status : true))
      .filter((task) => (filter.priority ? task.priority === filter.priority : true))
      .filter((task) =>
        filter.search
          ? `${task.title} ${task.description} ${task.comments}`
              .toLowerCase()
              .includes(filter.search.toLowerCase())
          : true,
      );
  }, [tasksState.data, filter]);

  useEffect(() => {
    const loadMetrics = async () => {
      const response = await fetch(`${API_BASE}/metrics`);
      const payload = await response.json();
      setMetrics(payload);
    };
    loadMetrics();
  }, [tasksState.data.length]);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, updated_by: "local-user" }),
    });
    setTaskForm({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      due_date: "",
      reminder_date: "",
      assignee_id: "",
      project_id: "",
      comments: "",
    });
    await tasksState.refresh();
    await activityState.refresh();
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    await fetch(`${API_BASE}/team-members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberForm),
    });
    setMemberForm({ name: "", role: "", email: "" });
    await membersState.refresh();
    await activityState.refresh();
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectForm),
    });
    setProjectForm({ name: "", description: "", status: "Active" });
    await projectsState.refresh();
    await activityState.refresh();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>TaskFlow Local</h1>
        <nav>
          <button onClick={() => setTab("tasks")} className={tab === "tasks" ? "active" : ""}>
            Tasks
          </button>
          <button onClick={() => setTab("members")} className={tab === "members" ? "active" : ""}>
            Team
          </button>
          <button
            onClick={() => setTab("projects")}
            className={tab === "projects" ? "active" : ""}
          >
            Projects
          </button>
          <button onClick={() => setTab("insights")} className={tab === "insights" ? "active" : ""}>
            Insights
          </button>
          <button onClick={() => setTab("activity")} className={tab === "activity" ? "active" : ""}>
            Activity
          </button>
        </nav>
        <div className="footer">
          <p>Offline-first · Excel storage</p>
        </div>
      </aside>

      <main>
        {tab === "tasks" && (
          <section>
            <header className="section-header">
              <div>
                <h2>Task List</h2>
                <p>Track every team task with status, priority, and due dates.</p>
              </div>
              <div className="filters">
                <select
                  value={filter.assignee_id}
                  onChange={(event) => setFilter({ ...filter, assignee_id: event.target.value })}
                >
                  <option value="">All members</option>
                  {membersState.data.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.project_id}
                  onChange={(event) => setFilter({ ...filter, project_id: event.target.value })}
                >
                  <option value="">All projects</option>
                  {projectsState.data.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.status}
                  onChange={(event) => setFilter({ ...filter, status: event.target.value })}
                >
                  <option value="">All status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.priority}
                  onChange={(event) => setFilter({ ...filter, priority: event.target.value })}
                >
                  <option value="">All priority</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Search"
                  value={filter.search}
                  onChange={(event) => setFilter({ ...filter, search: event.target.value })}
                />
              </div>
            </header>

            <div className="grid two-col">
              <form className="card" onSubmit={handleCreateTask}>
                <h3>Quick Add Task</h3>
                <label>
                  Title
                  <input
                    value={taskForm.title}
                    onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={taskForm.description}
                    onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                  />
                </label>
                <div className="row">
                  <label>
                    Status
                    <select
                      value={taskForm.status}
                      onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select
                      value={taskForm.priority}
                      onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="row">
                  <label>
                    Due Date
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
                    />
                  </label>
                  <label>
                    Reminder
                    <input
                      type="date"
                      value={taskForm.reminder_date}
                      onChange={(event) =>
                        setTaskForm({ ...taskForm, reminder_date: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  Assign to
                  <select
                    value={taskForm.assignee_id}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, assignee_id: event.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {membersState.data.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Project
                  <select
                    value={taskForm.project_id}
                    onChange={(event) => setTaskForm({ ...taskForm, project_id: event.target.value })}
                  >
                    <option value="">General</option>
                    {projectsState.data.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <textarea
                    value={taskForm.comments}
                    onChange={(event) => setTaskForm({ ...taskForm, comments: event.target.value })}
                  />
                </label>
                <button type="submit" className="primary">
                  Add Task
                </button>
              </form>

              <div className="card">
                <h3>Current Tasks</h3>
                {tasksState.loading ? (
                  <p>Loading tasks...</p>
                ) : (
                  <ul className="task-list">
                    {filteredTasks.map((task) => (
                      <li key={task.id}>
                        <div>
                          <h4>{task.title}</h4>
                          <p>{task.description || "No description"}</p>
                          <span className={`pill ${task.status.replace(" ", "-").toLowerCase()}`}>
                            {task.status}
                          </span>
                          <span className="pill neutral">{task.priority}</span>
                        </div>
                        <div className="meta">
                          <span>Due: {task.due_date || "Not set"}</span>
                          <span>Assignee: {task.assignee_id || "Unassigned"}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "members" && (
          <section>
            <header className="section-header">
              <div>
                <h2>Team Members</h2>
                <p>Manage teammates and see workload at a glance.</p>
              </div>
            </header>
            <div className="grid two-col">
              <form className="card" onSubmit={handleCreateMember}>
                <h3>Add Member</h3>
                <label>
                  Name
                  <input
                    value={memberForm.name}
                    onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Role
                  <input
                    value={memberForm.role}
                    onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })}
                    required
                  />
                </label>
                <button type="submit" className="primary">
                  Add Member
                </button>
              </form>

              <div className="card">
                <h3>Current Team</h3>
                {membersState.loading ? (
                  <p>Loading team...</p>
                ) : (
                  <ul className="info-list">
                    {membersState.data.map((member) => (
                      <li key={member.id}>
                        <div>
                          <h4>{member.name}</h4>
                          <p>{member.role}</p>
                          <small>{member.email}</small>
                        </div>
                        <span className="pill neutral">{member.workload} active tasks</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "projects" && (
          <section>
            <header className="section-header">
              <div>
                <h2>Projects</h2>
                <p>Group tasks by project and keep delivery on track.</p>
              </div>
            </header>
            <div className="grid two-col">
              <form className="card" onSubmit={handleCreateProject}>
                <h3>Add Project</h3>
                <label>
                  Name
                  <input
                    value={projectForm.name}
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={projectForm.description}
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, description: event.target.value })
                    }
                  />
                </label>
                <label>
                  Status
                  <input
                    value={projectForm.status}
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, status: event.target.value })
                    }
                  />
                </label>
                <button type="submit" className="primary">
                  Add Project
                </button>
              </form>

              <div className="card">
                <h3>Project Portfolio</h3>
                {projectsState.loading ? (
                  <p>Loading projects...</p>
                ) : (
                  <ul className="info-list">
                    {projectsState.data.map((project) => (
                      <li key={project.id}>
                        <div>
                          <h4>{project.name}</h4>
                          <p>{project.description || "No description"}</p>
                          <small>Status: {project.status}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "insights" && (
          <section>
            <header className="section-header">
              <div>
                <h2>Metrics & Insights</h2>
                <p>Daily progress and team productivity in one place.</p>
              </div>
            </header>
            <div className="grid three-col">
              <div className="card stat">
                <h3>Completed Today</h3>
                <p>{metrics?.completed_today ?? 0}</p>
              </div>
              <div className="card stat">
                <h3>Pending Tasks</h3>
                <p>{metrics?.pending_vs_completed?.pending ?? 0}</p>
              </div>
              <div className="card stat">
                <h3>Overdue Tasks</h3>
                <p>{metrics?.overdue ?? 0}</p>
              </div>
            </div>
            <div className="grid two-col">
              <div className="card">
                <h3>Project Progress</h3>
                <ul className="info-list">
                  {metrics?.project_progress?.map((project) => (
                    <li key={project.project_id}>
                      <div>
                        <h4>{project.name}</h4>
                        <p>{project.progress}% complete</p>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${project.progress}%` }} />
                      </div>
                    </li>
                  )) ?? <li>No project data yet.</li>}
                </ul>
              </div>
              <div className="card">
                <h3>Member Productivity</h3>
                <ul className="info-list">
                  {metrics?.member_productivity?.map((member) => (
                    <li key={member.member_id}>
                      <div>
                        <h4>{member.name}</h4>
                        <p>{member.completed} tasks completed</p>
                      </div>
                    </li>
                  )) ?? <li>No member data yet.</li>}
                </ul>
              </div>
            </div>
          </section>
        )}

        {tab === "activity" && (
          <section>
            <header className="section-header">
              <div>
                <h2>Activity Log</h2>
                <p>Every change captured locally.</p>
              </div>
            </header>
            <div className="card">
              <ul className="activity-list">
                {activityState.data.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <h4>
                        {entry.action} · {entry.entity_type}
                      </h4>
                      <p>{entry.details}</p>
                    </div>
                    <small>{entry.timestamp}</small>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
