"use client";
import React from "react";
export default function AtlasTasks({ ctx }: { ctx: any }) {
  const { todayISO, addDays, workPlanTasks, taskDetails, isAddisonUser, taskSearch, taskListFilter, selectedTaskId, setSelectedTaskId, fileToUploadedRecord, updateTaskDetails, showSaveToast, setWalkVoiceListening, cardStyle, colors, mutedSmallStyle, setTasksView, goldButtonStyle, isMobile, eyebrowStyle, secondaryButtonStyle, minutesLabel, plannerLocationName, noticeStyle, completeAtlasTask, skipRecurringTask, moveAtlasTaskToToday, moveAtlasTaskToTomorrow, moveAtlasTaskToDate, walkVoiceListening, setPreviewFile, setTaskListFilter, SectionHeader, tasksView, backlogItems, openGraduationPartyChecklist, renderOperationsAnalytics, renderSmartRoutePlanning, renderBuildMyDay, renderAddisonToday, renderWeeklyPlanner, renderBacklog, renderVehicleCare, renderSeasonalWork, renderOperationsTemplates, renderGraduationPartyChecklist, renderOperationsIntelligence, rapidTaskInputRef, newTaskTitle, setNewTaskTitle, addAtlasTask, inputStyle, focusRapidTaskInput, setTaskSearch, badgeStyle, formatDate, compactUtilityButtonStyle, assignTaskTo, addQuickTaskNote, addTaskPhoto, convertTaskToWorkOrder, Field, updateWorkPlanTask, SelectField, workPlanDays, photoTimelineProjects, serviceRecords, assetRecords, locations, vehicleCare, vendorRecords, procedureRecords, contactRecords, CreatableRelationshipField, quickCreateProject, fieldLabelStyle, quickCreateAsset, quickCreateLocation, quickCreateVendor, quickCreateContact, deleteAtlasTask, removeExactDuplicateTasks, taskFocusMode, setTaskFocusMode, mapIconButtonStyle, closeSymbol } = ctx;
    const today = todayISO();
    const weekEnd = addDays(today, 7);
    const priorityOrder = { High: 0, Medium: 1, Low: 2 } as const;
    const allTaskRows = workPlanTasks.filter((task) => {
      const meta = taskDetails(task.id);
      if (task.category === "Atlas List Definition") return false;
      if (meta.listId && !isAddisonUser) return false;
      if (meta.listId && isAddisonUser && !meta.dashboardListPinned) return false;
      if (isAddisonUser) return meta.assignee === "Addison" && meta.status !== "Completed";
      return true;
    });
    const counts = {
      today: allTaskRows.filter((task) => {
        const meta = taskDetails(task.id);
        return meta.status !== "Completed" && (!meta.dueDate || meta.dueDate === today);
      }).length,
      overdue: allTaskRows.filter((task) => {
        const meta = taskDetails(task.id);
        return meta.status !== "Completed" && Boolean(meta.dueDate && meta.dueDate < today);
      }).length,
      week: allTaskRows.filter((task) => {
        const meta = taskDetails(task.id);
        return meta.status !== "Completed" && Boolean(meta.dueDate && meta.dueDate >= today && meta.dueDate <= weekEnd);
      }).length,
      recurring: allTaskRows.filter((task) => task.recurring && taskDetails(task.id).status !== "Completed").length,
      completed: allTaskRows.filter((task) => taskDetails(task.id).status === "Completed").length,
    };
    const query = taskSearch.trim().toLowerCase();
    const visibleTasks = allTaskRows
      .filter((task) => {
        const meta = taskDetails(task.id);
        if (query && !`${task.title} ${task.category} ${meta.notes || ""} ${meta.assignee}`.toLowerCase().includes(query)) return false;
        if (taskListFilter === "completed") return meta.status === "Completed";
        if (meta.status === "Completed") return false;
        if (taskListFilter === "today") return !meta.dueDate || meta.dueDate === today;
        if (taskListFilter === "overdue") return Boolean(meta.dueDate && meta.dueDate < today);
        if (taskListFilter === "week") return Boolean(meta.dueDate && meta.dueDate >= today && meta.dueDate <= weekEnd);
        if (taskListFilter === "recurring") return Boolean(task.recurring);
        return true;
      })
      .sort((a, b) => {
        const am = taskDetails(a.id);
        const bm = taskDetails(b.id);
        return String(am.dueDate || "9999-12-31").localeCompare(String(bm.dueDate || "9999-12-31")) || priorityOrder[a.priority] - priorityOrder[b.priority] || a.title.localeCompare(b.title);
      });
    const selectedTask = workPlanTasks.find((item) => item.id === selectedTaskId) || visibleTasks[0];
    const selectedMeta = selectedTask ? taskDetails(selectedTask.id) : null;
    const focusTasks = allTaskRows.filter((task) => {
      const meta = taskDetails(task.id);
      return meta.status !== "Completed" && (!meta.dueDate || meta.dueDate <= today);
    }).sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority] || String(taskDetails(a.id).dueDate || "").localeCompare(String(taskDetails(b.id).dueDate || "")));
    const focusIndex = Math.max(0, focusTasks.findIndex((task) => task.id === selectedTask?.id));
    const focusTask = focusTasks[focusIndex] || focusTasks[0];
    const focusMeta = focusTask ? taskDetails(focusTask.id) : null;

    const walkNext = (currentTask: any) => {
      const currentIndex = focusTasks.findIndex((task) => task.id === currentTask.id);
      const next = focusTasks[currentIndex + 1] || focusTasks.find((task) => task.id !== currentTask.id);
      setSelectedTaskId(next?.id || "");
    };
    const addWalkPhoto = async (task: any, files: FileList | null) => {
      if (!files?.length) return;
      try {
        const uploaded = await Promise.all(Array.from(files).filter((file) => file.type.startsWith("image/")).map(fileToUploadedRecord));
        updateTaskDetails(task.id, { photos: [...(taskDetails(task.id).photos || []), ...uploaded] });
        showSaveToast("Photo added to task.");
      } catch {
        showSaveToast("Atlas could not add that photo.", "warning");
      }
    };
    const addWalkVoiceNote = (task: any) => {
      type SpeechRecognitionInstance = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
      type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
      const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
      const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (!Recognition) {
        const note = window.prompt("Voice capture is unavailable here. Type the field note instead:", "");
        if (note?.trim()) updateTaskDetails(task.id, { notes: `${taskDetails(task.id).notes ? `${taskDetails(task.id).notes}\n` : ""}${note.trim()} — ${new Date().toLocaleString()}` });
        return;
      }
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) updateTaskDetails(task.id, { notes: `${taskDetails(task.id).notes ? `${taskDetails(task.id).notes}\n` : ""}${transcript} — ${new Date().toLocaleString()}` });
        showSaveToast(transcript ? "Voice note added." : "No voice note recorded.");
      };
      recognition.onerror = () => showSaveToast("Atlas could not record that voice note.", "warning");
      recognition.onend = () => setWalkVoiceListening(false);
      setWalkVoiceListening(true);
      recognition.start();
    };
    const flagWalkProblem = (task: any) => {
      const meta = taskDetails(task.id);
      const problem = window.prompt("What is the problem?", meta.problemFlag || "");
      if (problem === null) return;
      updateTaskDetails(task.id, { status: problem.trim() ? "Blocked" : "Open", problemFlag: problem.trim(), notes: problem.trim() ? `${meta.notes ? `${meta.notes}\n` : ""}PROBLEM: ${problem.trim()} — ${new Date().toLocaleString()}` : meta.notes });
      if (problem.trim()) walkNext(task);
    };
    const renderWalkMode = () => {
      if (!focusTask || !focusMeta) return <section style={{ ...cardStyle, minHeight: "65vh", display: "grid", placeItems: "center", textAlign: "center" }}><div><div style={{ fontSize: 52 }}>✓</div><h2 style={{ color: colors.navy }}>All caught up</h2><p style={mutedSmallStyle}>No open work is due right now.</p><button type="button" onClick={() => setTasksView("tasks")} style={goldButtonStyle}>Back to Tasks</button></div></section>;
      const nearby = focusTasks.filter((task) => task.id !== focusTask.id && task.locationId === focusTask.locationId).slice(0, 3);
      return <section style={{ minHeight: "72vh", borderRadius: 20, padding: isMobile ? 16 : 24, background: "linear-gradient(155deg,#FFFDF2 0%,#FFFFFF 58%,#F3F8FC 100%)", border: `2px solid ${colors.gold}`, boxShadow: "0 18px 50px rgba(8,28,51,.15)", display: "grid", alignContent: "start", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ ...eyebrowStyle, color: colors.navy }}>WALK MODE · {focusIndex + 1} OF {focusTasks.length}</div><small style={{ color: colors.muted }}>Outdoor field view</small></div><button type="button" onClick={() => setTasksView("tasks")} style={{ ...secondaryButtonStyle, width: "auto", minHeight: 44 }}>Exit</button></div>
        <div style={{ borderRadius: 18, background: colors.navy, color: "#FFFFFF", padding: isMobile ? 18 : 25 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><span style={{ padding: "5px 9px", borderRadius: 999, background: colors.gold, color: colors.navy, fontWeight: 900, fontSize: 12 }}>{focusTask.priority}</span><strong style={{ fontSize: 15 }}>{minutesLabel(focusTask.minutes)}</strong></div><h1 style={{ margin: "18px 0 8px", fontSize: isMobile ? 31 : 40, lineHeight: 1.08, color: "#FFFFFF" }}>{focusTask.title}</h1><div style={{ fontSize: 17, fontWeight: 800, color: colors.gold2 }}>{plannerLocationName(focusTask.locationId)}</div>{focusMeta.instructions || focusTask.notes || focusMeta.notes ? <p style={{ margin: "15px 0 0", fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{focusMeta.instructions || focusTask.notes || focusMeta.notes}</p> : null}</div>
        {focusMeta.problemFlag ? <div style={{ ...noticeStyle, border: "2px solid #D83737", background: "#FFF0F0", color: "#8A1111", fontSize: 15 }}><strong>Problem:</strong> {focusMeta.problemFlag}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: 10 }}><button type="button" onClick={() => { const task = focusTask; walkNext(task); completeAtlasTask(task); }} style={{ ...goldButtonStyle, minHeight: 68, fontSize: 20 }}>✓ Complete</button><button type="button" onClick={() => { const task = focusTask; walkNext(task); task.recurring ? skipRecurringTask(task) : moveAtlasTaskToTomorrow(task); }} style={{ ...secondaryButtonStyle, minHeight: 68, fontSize: 18, background: "#FFFFFF" }}>Skip</button><button type="button" onClick={() => flagWalkProblem(focusTask)} style={{ ...secondaryButtonStyle, minHeight: 68, fontSize: 18, color: "#A51E1E", borderColor: "#D83737", background: "#FFFFFF" }}>Problem</button></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}><label style={{ ...secondaryButtonStyle, minHeight: 58, fontSize: 16, background: "#FFFFFF", cursor: "pointer" }}>Take Photo<input type="file" accept="image/*" capture="environment" onChange={(event) => { void addWalkPhoto(focusTask, event.currentTarget.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label><label style={{ ...secondaryButtonStyle, minHeight: 58, fontSize: 16, background: "#FFFFFF", cursor: "pointer" }}>Choose from Library<input type="file" accept="image/*" multiple onChange={(event) => { void addWalkPhoto(focusTask, event.currentTarget.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label><button type="button" onClick={() => addWalkVoiceNote(focusTask)} disabled={walkVoiceListening} style={{ ...secondaryButtonStyle, minHeight: 58, fontSize: 16, background: walkVoiceListening ? colors.gold2 : "#FFFFFF" }}>{walkVoiceListening ? "Listening…" : "Voice Note"}</button></div>
        {(focusMeta.photos || []).length ? <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>{(focusMeta.photos || []).map((photo) => <button key={photo.id} type="button" onClick={() => setPreviewFile(photo)} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 0, overflow: "hidden", background: "#FFFFFF" }}><img src={photo.dataUrl || photo.url} alt={photo.name} style={{ width: 88, height: 68, objectFit: "cover", display: "block" }} /></button>)}</div> : null}
        {nearby.length ? <div><div style={{ ...eyebrowStyle, marginBottom: 8 }}>NEARBY · {plannerLocationName(focusTask.locationId)}</div><div style={{ display: "grid", gap: 8 }}>{nearby.map((task) => <button key={`walk-nearby-${task.id}`} type="button" onClick={() => setSelectedTaskId(task.id)} style={{ ...secondaryButtonStyle, background: "#FFFFFF", textAlign: "left", justifyContent: "space-between", minHeight: 52 }}><span>{task.title}</span><small>{minutesLabel(task.minutes)}</small></button>)}</div></div> : null}
      </section>;
    };

    const canCompleteTask = (task: any) => {
      const dueDate = String(taskDetails(task.id).dueDate || "").slice(0, 10);
      return !dueDate || dueDate <= todayISO();
    };
    const isFutureTask = (task: any) => {
      const dueDate = String(taskDetails(task.id).dueDate || "").slice(0, 10);
      return Boolean(dueDate && dueDate > todayISO());
    };

    const filterButton = (id: any, label: string, count: number) => (
      <button type="button" onClick={() => setTaskListFilter(id)} style={{ ...(taskListFilter === id ? goldButtonStyle : secondaryButtonStyle), padding: "7px 10px" }}>{label} · {count}</button>
    );

    return (
      <div style={{ display: "grid", gap: 14 }}>
        <SectionHeader
          eyebrow={tasksView === "walk" ? "Field Operations" : tasksView === "analytics" ? "Performance" : tasksView === "addison" ? "Team Operations" : tasksView === "route" ? "Property Route" : tasksView === "build" ? "Estate Brain" : tasksView === "vehicles" ? "Operations" : tasksView === "planner" ? "Planning" : "Work"}
          title={isAddisonUser ? "My Tasks" : tasksView === "walk" ? "Walk Mode" : tasksView === "analytics" ? "Operations Analytics" : tasksView === "addison" ? "Addison Work Manager" : tasksView === "route" ? "Smart Route" : tasksView === "build" ? "Build My Day" : tasksView === "vehicles" ? "Garage" : tasksView === "planner" ? "Plan Week" : tasksView === "lists" ? "Lists" : "Tasks"}
          detail={isAddisonUser ? "Work assigned to Addison for today and upcoming days." : tasksView === "walk" ? "A bright, simplified field view for completing work around the property." : tasksView === "analytics" ? "Use completed work history to see workload, delays, compliance, vendor performance, and project momentum." : tasksView === "addison" ? "Assign, explain, track, and review Addison’s daily work from one dedicated view." : tasksView === "route" ? "Complete nearby work together to reduce walking and context switching across the property." : tasksView === "build" ? "Atlas combines current work, routine, project, vehicle, weather, duration, and priority signals into one realistic day." : tasksView === "vehicles" ? "Cars, vehicles, cleaning, service, and connected records." : tasksView === "planner" ? "Balance existing work across the week. Tasks remain managed in Tasks." : tasksView === "lists" ? "Reusable checklists for events, seasons, openings, closings, and special activities." : "Your main daily work area for one-time and recurring tasks."}
          right={tasksView === "tasks" && !isAddisonUser ? <button type="button" onClick={() => { setSelectedTaskId(focusTask?.id || ""); setTasksView("walk"); }} disabled={!focusTasks.length} style={goldButtonStyle}>Start Walk Mode</button> : undefined}
        />
        {!isAddisonUser && tasksView !== "vehicles" && tasksView !== "planner" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setTasksView("build")} style={tasksView === "build" ? goldButtonStyle : secondaryButtonStyle}>Build My Day</button>
            <button type="button" onClick={() => { setSelectedTaskId(focusTask?.id || ""); setTasksView("walk"); }} style={tasksView === "walk" ? goldButtonStyle : secondaryButtonStyle}>Walk Mode</button>
            <button type="button" onClick={() => setTasksView("route")} style={tasksView === "route" ? goldButtonStyle : secondaryButtonStyle}>Smart Route</button>
            <button type="button" onClick={() => setTasksView("analytics")} style={tasksView === "analytics" ? goldButtonStyle : secondaryButtonStyle}>Analytics</button>
            <button type="button" onClick={() => setTasksView("backlog")} style={tasksView === "backlog" ? goldButtonStyle : secondaryButtonStyle}>Backlog · {backlogItems.length}</button>
            <button type="button" onClick={() => setTasksView("seasonal")} style={tasksView === "seasonal" ? goldButtonStyle : secondaryButtonStyle}>Seasonal</button>
            <button type="button" onClick={() => setTasksView("templates")} style={tasksView === "templates" ? goldButtonStyle : secondaryButtonStyle}>Templates</button>
            <button type="button" onClick={openGraduationPartyChecklist} style={tasksView === "lists" ? goldButtonStyle : secondaryButtonStyle}>Lists</button>
            <button type="button" onClick={() => setTasksView("intelligence")} style={tasksView === "intelligence" ? goldButtonStyle : secondaryButtonStyle}>Atlas Manager</button>
          </div>
        ) : null}

        {tasksView === "walk" && !isAddisonUser ? renderWalkMode() : tasksView === "analytics" && !isAddisonUser ? renderOperationsAnalytics() : tasksView === "route" && !isAddisonUser ? renderSmartRoutePlanning() : tasksView === "build" && !isAddisonUser ? renderBuildMyDay() : tasksView === "addison" && !isAddisonUser ? renderAddisonToday() : tasksView === "planner" && !isAddisonUser ? renderWeeklyPlanner() : tasksView === "backlog" && !isAddisonUser ? renderBacklog() : tasksView === "vehicles" && !isAddisonUser ? renderVehicleCare() : tasksView === "seasonal" && !isAddisonUser ? renderSeasonalWork() : tasksView === "templates" && !isAddisonUser ? renderOperationsTemplates() : tasksView === "lists" && !isAddisonUser ? renderGraduationPartyChecklist() : tasksView === "intelligence" && !isAddisonUser ? renderOperationsIntelligence() : (
          <>
            {!isAddisonUser ? (
              <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto", gap: 8 }}>
                <input
                  ref={rapidTaskInputRef}
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addAtlasTask(undefined, true);
                  }}
                  placeholder="Type a task and press Enter…"
                  autoComplete="off"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={removeExactDuplicateTasks}
                    style={secondaryButtonStyle}
                  >
                    Remove Exact Duplicates
                  </button>
                  <button type="button" onClick={() => focusRapidTaskInput(true)} style={goldButtonStyle}>
                    Add Task
                  </button>
                </div>
              </div>
            ) : null}
            <div style={{ ...cardStyle, padding: 11, display: "grid", gap: 9, background: "#F8FAFC", borderColor: "#D5E0EA" }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {filterButton("today", "Today", counts.today)}
                {filterButton("overdue", "Overdue", counts.overdue)}
                {filterButton("week", "This Week", counts.week)}
                {filterButton("recurring", "Recurring", counts.recurring)}
                {filterButton("completed", "Completed", counts.completed)}
              </div>
              <input value={taskSearch} onChange={(event) => setTaskSearch(event.currentTarget.value)} placeholder="Search tasks…" style={{ ...inputStyle, padding: "8px 10px" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(300px, 38%) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
              <section style={{ ...cardStyle, padding: 10, overflow: "hidden", background: "#F5F8FB", borderColor: "#D5E0EA" }}>
                <div style={{ padding: "2px 2px 10px", borderBottom: `1px solid ${colors.line}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>{visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"}</strong>
                  <small style={mutedSmallStyle}>{minutesLabel(visibleTasks.reduce((sum, task) => sum + Math.max(5, Number(task.minutes || 0)), 0))}</small>
                </div>
                <div style={{ maxHeight: isMobile ? 500 : "70vh", overflowY: "auto", display: "grid", gap: 8, paddingTop: 10, paddingRight: 3 }}>
                  {visibleTasks.map((task) => {
                    const meta = taskDetails(task.id);
                    const selected = selectedTask?.id === task.id;
                    return <div key={task.id} style={{
                      border: `1px solid ${selected ? "#89A9C8" : meta.status === "Completed" ? "#CFE0D6" : colors.line}`,
                      borderLeft: `4px solid ${meta.status === "Completed" ? "#3C8A68" : task.priority === "High" ? "#B04A4A" : task.priority === "Medium" ? colors.gold : "#8CA0B3"}`,
                      borderRadius: 11,
                      background: selected ? "#EDF5FC" : meta.status === "Completed" ? "#F5FAF7" : "#FFFFFF",
                      padding: "10px 11px",
                      display: "grid",
                      gap: 8,
                      boxShadow: selected ? "0 5px 14px rgba(19,57,91,.10)" : "0 1px 3px rgba(15,35,55,.05)",
                    }}>
                      <button type="button" onClick={() => setSelectedTaskId(task.id)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><strong style={{ color: colors.navy3, fontSize: 14, lineHeight: 1.25 }}>{task.title}</strong><span style={badgeStyle(task.priority)}>{task.priority}</span></div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                          <span style={{ ...mutedSmallStyle, padding: "2px 6px", borderRadius: 999, background: "#EEF3F7" }}>{meta.dueDate ? formatDate(meta.dueDate) : "No due date"}</span>
                          <span style={{ ...mutedSmallStyle, padding: "2px 6px", borderRadius: 999, background: "#EEF3F7" }}>{minutesLabel(task.minutes)}</span>
                          <span style={{ ...mutedSmallStyle, padding: "2px 6px", borderRadius: 999, background: meta.assignee === "Addison" ? "#FFF5D9" : "#EEF3F7", color: meta.assignee === "Addison" ? colors.navy : undefined }}>{meta.assignee}</span>
                          {task.recurring ? <span style={{ ...mutedSmallStyle, padding: "2px 6px", borderRadius: 999, background: "#EEF3F7" }}>Recurring</span> : null}
                        </div>
                      </button>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                        {meta.status !== "Completed" ? <button type="button" disabled={!canCompleteTask(task)} title={!canCompleteTask(task) ? `Due ${formatDate(meta.dueDate)} — cannot complete early` : undefined} onClick={() => completeAtlasTask(task)} style={{ ...compactUtilityButtonStyle, opacity: canCompleteTask(task) ? 1 : .45, cursor: canCompleteTask(task) ? "pointer" : "not-allowed" }}>{canCompleteTask(task) ? "Done" : "Future"}</button> : null}
                        {meta.status !== "Completed" && isFutureTask(task) ? (
                          <button
                            type="button"
                            onClick={() => moveAtlasTaskToToday(task)}
                            style={compactUtilityButtonStyle}
                          >
                            Move to Today
                          </button>
                        ) : null}
                        {meta.status !== "Completed" ? <button type="button" onClick={() => moveAtlasTaskToTomorrow(task)} style={compactUtilityButtonStyle}>Tomorrow</button> : null}
                        {meta.assignee !== "Addison" && !isAddisonUser ? <button type="button" onClick={() => assignTaskTo(task, "Addison")} style={compactUtilityButtonStyle}>Addison</button> : null}
                        {meta.assignee !== "Pat" && !isAddisonUser ? <button type="button" onClick={() => assignTaskTo(task, "Pat")} style={compactUtilityButtonStyle}>Pat</button> : null}
                        <button type="button" onClick={() => addQuickTaskNote(task)} style={compactUtilityButtonStyle}>Note</button>
                      </div>
                    </div>;
                  })}
                  {!visibleTasks.length ? <div style={{ padding: 18, ...mutedSmallStyle }}>No tasks in this view.</div> : null}
                </div>
              </section>

              <section style={{ ...cardStyle, position: isMobile ? "static" : "sticky", top: 16, maxHeight: isMobile ? "none" : "calc(100vh - 150px)", overflowY: isMobile ? "visible" : "auto" }}>
                {selectedTask && selectedMeta ? (
                  <div style={{ display: "grid", gap: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div><div style={eyebrowStyle}>Task Details</div><h2 style={{ margin: "3px 0 0", color: colors.navy }}>{selectedTask.title}</h2></div>
                      <span style={badgeStyle(selectedMeta.status === "Completed" ? "Completed" : selectedTask.priority)}>{selectedMeta.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {selectedMeta.status !== "Completed" ? <button type="button" disabled={!canCompleteTask(selectedTask)} title={!canCompleteTask(selectedTask) ? `Due ${formatDate(selectedMeta.dueDate)} — cannot complete early` : undefined} onClick={() => completeAtlasTask(selectedTask)} style={{ ...goldButtonStyle, opacity: canCompleteTask(selectedTask) ? 1 : .5, cursor: canCompleteTask(selectedTask) ? "pointer" : "not-allowed" }}>{canCompleteTask(selectedTask) ? "Complete" : `Due ${formatDate(selectedMeta.dueDate)}`}</button> : <button type="button" onClick={() => updateTaskDetails(selectedTask.id, { status: "Open", completedAt: undefined })} style={secondaryButtonStyle}>Reopen</button>}
                      {selectedMeta.status !== "Completed" ? <button type="button" onClick={() => moveAtlasTaskToTomorrow(selectedTask)} style={secondaryButtonStyle}>Tomorrow</button> : null}
                      <button type="button" onClick={() => addTaskPhoto(selectedTask)} style={secondaryButtonStyle}>Add Photo</button>
                      <button type="button" onClick={() => addQuickTaskNote(selectedTask)} style={secondaryButtonStyle}>Add Note</button>
                      {!isAddisonUser ? <button type="button" onClick={() => convertTaskToWorkOrder(selectedTask)} style={secondaryButtonStyle}>Convert to Work Order</button> : null}
                    </div>
                    <Field label="Task" value={selectedTask.title} onChange={(value) => updateWorkPlanTask(selectedTask.id, { title: value })} />
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 9 }}>
                      <Field
                      label="Due date"
                      type="date"
                      value={selectedMeta.dueDate}
                      onChange={(value) => moveAtlasTaskToDate(selectedTask, value)}
                    />
                      <SelectField label="Status" value={selectedMeta.status} onChange={(value) => updateTaskDetails(selectedTask.id, { status: value as any, completedAt: value === "Completed" ? new Date().toISOString() : undefined })} options={canCompleteTask(selectedTask) ? ["Open","In Progress","Waiting","Blocked","Completed"] : ["Open","In Progress","Waiting","Blocked"]} />
                      <SelectField label="Priority" value={selectedTask.priority} onChange={(value) => updateWorkPlanTask(selectedTask.id, { priority: value as any })} options={["High","Medium","Low"]} />
                      <SelectField label="Assigned to" value={selectedMeta.assignee} onChange={(value) => updateTaskDetails(selectedTask.id, { assignee: value as any })} options={["Nick","Addison","Pat","Other","Unassigned"]} />
                      <Field label="Estimated minutes" type="number" value={String(selectedTask.minutes)} onChange={(value) => updateWorkPlanTask(selectedTask.id, { minutes: Math.max(5, Number(value) || 5) })} />
                      <SelectField label="Category" value={selectedTask.category} onChange={(value) => updateWorkPlanTask(selectedTask.id, { category: value })} options={["General","Cleanup / Prep","Landscaping","Maintenance","Administration","Planning","Inspection","Garage","Pool & Spa","Vehicle Care","Boat / Dock"]} />
                      <SelectField label="Preferred day" value={selectedTask.preferredDay || "Auto"} onChange={(value) => updateWorkPlanTask(selectedTask.id, { preferredDay: value as any })} options={["Auto", ...workPlanDays]} />
                      <Field label="Preferred time" type="time" value={selectedTask.fixedTime || ""} onChange={(value) => updateWorkPlanTask(selectedTask.id, { fixedTime: value })} />
                      <SelectField label="Season" value={selectedMeta.season || "Year-Round"} onChange={(value) => updateTaskDetails(selectedTask.id, { season: value as any })} options={["Year-Round","Spring","Summer","Fall","Winter"]} />
                      <SelectField label="Weather" value={selectedMeta.weatherDependency || "None"} onChange={(value) => updateTaskDetails(selectedTask.id, { weatherDependency: value as any })} options={["None","Dry","No rain","Warm","Cool","Low wind"]} />
                    </div>
                    <details style={{ ...noticeStyle, padding: 10 }} open>
                      <summary style={{ cursor: "pointer", fontWeight: 900, color: colors.navy }}>Related Records</summary>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9, marginBottom: 9 }}>
                        {selectedMeta.projectId ? <span style={badgeStyle("Monitor")}>Project · {photoTimelineProjects.find((item) => item.id === selectedMeta.projectId)?.title || "Linked"}</span> : null}
                        {selectedMeta.workOrderId ? <span style={badgeStyle("Scheduled")}>Work Order · {serviceRecords.find((item) => item.id === selectedMeta.workOrderId)?.title || "Linked"}</span> : null}
                        {selectedMeta.assetId ? <span style={badgeStyle("Online")}>Asset · {assetRecords.find((item) => item.id === selectedMeta.assetId)?.name || "Linked"}</span> : null}
                        {selectedTask.locationId ? <span style={badgeStyle("Normal")}>Location · {locations.find((item) => item.id === selectedTask.locationId)?.name || "General"}</span> : null}
                        {selectedMeta.vehicleId ? <span style={badgeStyle("Normal")}>Vehicle · {vehicleCare.find((item) => item.id === selectedMeta.vehicleId)?.name || "Linked"}</span> : null}
                        {selectedMeta.vendorId ? <span style={badgeStyle("Normal")}>Vendor · {vendorRecords.find((item) => item.id === selectedMeta.vendorId)?.name || "Linked"}</span> : null}
                        {selectedMeta.procedureId ? <span style={badgeStyle("Normal")}>Procedure · {procedureRecords.find((item) => item.id === selectedMeta.procedureId)?.title || "Linked"}</span> : null}
                        {selectedMeta.contactId ? <span style={badgeStyle("Normal")}>Contact · {contactRecords.find((item) => item.id === selectedMeta.contactId)?.name || "Linked"}</span> : null}
                        {!selectedMeta.projectId && !selectedMeta.workOrderId && !selectedMeta.assetId && !selectedTask.locationId && !selectedMeta.vehicleId && !selectedMeta.vendorId && !selectedMeta.procedureId && !selectedMeta.contactId ? <span style={mutedSmallStyle}>No related records yet.</span> : null}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 9 }}>
                        <CreatableRelationshipField label="Project" value={selectedMeta.projectId || ""} emptyLabel="No project" options={photoTimelineProjects.filter((project) => !project.archived).map((project) => ({ id: project.id, label: project.title }))} onChange={(id) => updateTaskDetails(selectedTask.id, { projectId: id || undefined })} onCreate={quickCreateProject}/>
                        <label style={fieldLabelStyle}>Work Order<select value={selectedMeta.workOrderId || ""} onChange={(event) => updateTaskDetails(selectedTask.id, { workOrderId: event.currentTarget.value || undefined })} style={inputStyle}><option value="">No work order</option>{serviceRecords.filter((record) => record.status !== "Completed").map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
                        <CreatableRelationshipField label="Asset" value={selectedMeta.assetId || ""} emptyLabel="No asset" options={assetRecords.map((record) => ({ id: record.id, label: record.name }))} onChange={(id) => updateTaskDetails(selectedTask.id, { assetId: id || undefined })} onCreate={quickCreateAsset}/>
                        <CreatableRelationshipField label="Location" value={selectedTask.locationId || ""} emptyLabel="General" options={locations.map((record) => ({ id: record.id, label: record.name }))} onChange={(id) => updateWorkPlanTask(selectedTask.id, { locationId: id })} onCreate={quickCreateLocation}/>
                        <label style={fieldLabelStyle}>Vehicle / Equipment<select value={selectedMeta.vehicleId || ""} onChange={(event) => updateTaskDetails(selectedTask.id, { vehicleId: event.currentTarget.value || undefined })} style={inputStyle}><option value="">No vehicle</option>{vehicleCare.map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
                        <CreatableRelationshipField label="Vendor" value={selectedMeta.vendorId || ""} emptyLabel="No vendor" options={vendorRecords.map((record) => ({ id: record.id, label: record.name }))} onChange={(id) => updateTaskDetails(selectedTask.id, { vendorId: id || undefined })} onCreate={quickCreateVendor}/>
                        <label style={fieldLabelStyle}>Procedure<select value={selectedMeta.procedureId || ""} onChange={(event) => updateTaskDetails(selectedTask.id, { procedureId: event.currentTarget.value || undefined })} style={inputStyle}><option value="">No procedure</option>{procedureRecords.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
                        <CreatableRelationshipField label="Contact" value={selectedMeta.contactId || ""} emptyLabel="No contact" options={contactRecords.map((record) => ({ id: record.id, label: record.name }))} onChange={(id) => updateTaskDetails(selectedTask.id, { contactId: id || undefined })} onCreate={quickCreateContact}/>
                      </div>
                    </details>
                    <details style={{ ...noticeStyle, padding: 10 }} open={Boolean(selectedTask.recurring)}>
                      <summary style={{ cursor: "pointer", fontWeight: 900 }}>Recurring schedule</summary>
                      <div style={{ display: "grid", gap: 9, marginTop: 9 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}><input type="checkbox" checked={Boolean(selectedTask.recurring)} onChange={(event) => updateWorkPlanTask(selectedTask.id, { recurring: event.currentTarget.checked })} />Repeating task</label>
                        {selectedTask.recurring ? <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 9 }}><Field label="Repeat every" type="number" value={String(selectedMeta.recurrenceInterval || 1)} onChange={(value) => updateTaskDetails(selectedTask.id, { recurrenceInterval: Math.max(1, Number(value) || 1) })} /><SelectField label="Frequency" value={selectedMeta.recurrenceUnit || "Weeks"} onChange={(value) => updateTaskDetails(selectedTask.id, { recurrenceUnit: value as any })} options={["Days","Weeks","Months","Years"]} /><Field label="Repeat until" type="date" value={selectedMeta.recurrenceEndDate || ""} onChange={(value) => updateTaskDetails(selectedTask.id, { recurrenceEndDate: value })} /><div style={{ display: "grid", alignContent: "end", gap: 6 }}><label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={selectedMeta.flexibleTime !== false} onChange={(event) => updateTaskDetails(selectedTask.id, { flexibleTime: event.currentTarget.checked })} />Flexible time</label><label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={selectedMeta.skippable !== false} onChange={(event) => updateTaskDetails(selectedTask.id, { skippable: event.currentTarget.checked })} />Can skip an occurrence</label></div></div> : null}
                      </div>
                    </details>
                    <Field label="Instructions for assigned worker" value={selectedMeta.instructions || ""} onChange={(value) => updateTaskDetails(selectedTask.id, { instructions: value })} multiline />
                    <Field label="Notes" value={selectedMeta.notes || selectedTask.notes || ""} onChange={(value) => updateTaskDetails(selectedTask.id, { notes: value })} multiline />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!isAddisonUser ? selectedMeta.assignee !== "Addison" ? <button type="button" onClick={() => assignTaskTo(selectedTask, "Addison")} style={goldButtonStyle}>Add to Addison</button> : <span style={badgeStyle("Scheduled")}>Assigned to Addison</span> : null}
                      {selectedMeta.assignee !== "Pat" && !isAddisonUser ? <button type="button" onClick={() => assignTaskTo(selectedTask, "Pat")} style={secondaryButtonStyle}>Add to Pat</button> : selectedMeta.assignee === "Pat" ? <span style={badgeStyle("Scheduled")}>Assigned to Pat</span> : null}
                      {selectedTask.recurring &&
                      selectedMeta.status !== "Completed" &&
                      selectedMeta.skippable !== false ? (
                        <button
                          type="button"
                          disabled={isFutureTask(selectedTask)}
                          title={
                            isFutureTask(selectedTask)
                              ? `Due ${formatDate(selectedMeta.dueDate)} — cannot skip early`
                              : undefined
                          }
                          onClick={() => skipRecurringTask(selectedTask)}
                          style={{
                            ...secondaryButtonStyle,
                            opacity: isFutureTask(selectedTask) ? 0.45 : 1,
                            cursor: isFutureTask(selectedTask) ? "not-allowed" : "pointer",
                          }}
                        >
                          Skip occurrence
                        </button>
                      ) : null}
                      {!isAddisonUser ? <button type="button" onClick={() => deleteAtlasTask(selectedTask.id)} style={{ ...secondaryButtonStyle, color: colors.red }}>Delete</button> : null}
                    </div>
                  </div>
                ) : <div style={noticeStyle}>Select a task from the list.</div>}
              </section>
            </div>
          </>
        )}

        {taskFocusMode ? <div style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(8,28,51,.62)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setTaskFocusMode(false)}><section style={{ ...cardStyle, width: "min(560px,100%)", padding: 20 }} onClick={(event) => event.stopPropagation()}>{focusTask && focusMeta ? <div style={{ display: "grid", gap: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={eyebrowStyle}>Focus Mode · {focusIndex + 1} of {focusTasks.length}</div><h2 style={{ margin: "4px 0", color: colors.navy }}>{focusTask.title}</h2><small style={mutedSmallStyle}>{plannerLocationName(focusTask.locationId)} · {minutesLabel(focusTask.minutes)}{focusMeta.dueDate ? ` · ${formatDate(focusMeta.dueDate)}` : ""}</small></div><button type="button" onClick={() => setTaskFocusMode(false)} style={mapIconButtonStyle}>{closeSymbol}</button></div><Field label="Quick note" value={focusMeta.notes || ""} onChange={(value) => updateTaskDetails(focusTask.id, { notes: value })} multiline /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" disabled={!canCompleteTask(focusTask)} onClick={() => { completeAtlasTask(focusTask); const next = focusTasks[focusIndex + 1] || focusTasks[0]; if (next) setSelectedTaskId(next.id); }} style={{ ...goldButtonStyle, opacity: canCompleteTask(focusTask) ? 1 : .5, cursor: canCompleteTask(focusTask) ? "pointer" : "not-allowed" }}>{canCompleteTask(focusTask) ? "Complete & Next" : `Due ${formatDate(focusMeta.dueDate)}`}</button><button type="button" onClick={() => { moveAtlasTaskToTomorrow(focusTask); const next = focusTasks[focusIndex + 1]; if (next) setSelectedTaskId(next.id); }} style={secondaryButtonStyle}>Tomorrow</button><button type="button" onClick={() => updateTaskDetails(focusTask.id, { status: "Blocked" })} style={{ ...secondaryButtonStyle, color: colors.red }}>Problem</button><button type="button" onClick={() => { const next = focusTasks[(focusIndex + 1) % focusTasks.length]; if (next) setSelectedTaskId(next.id); }} style={secondaryButtonStyle}>Next</button></div></div> : <div style={noticeStyle}>No tasks are due right now.</div>}</section></div> : null}
      </div>
    );
  }
