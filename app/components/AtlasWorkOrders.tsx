{isRecordDirty("work_order", selectedService.id) ? (
  <button
    type="button"
    onClick={() => void saveWorkOrderRecord()}
    style={{ ...goldButtonStyle, width: "100%" }}
  >
    Save Changes
  </button>
) : null}

<select
  value=""
  onChange={(event) => {
    handleDetailAction(event.currentTarget.value);
    event.currentTarget.value = "";
  }}
  style={{
    ...controlStyle,
    minHeight: 40,
    color: colors.muted,
    fontSize: 13,
    fontWeight: 400,
    background: "#FFFFFF",
  }}
  aria-label="Work order actions"
>
  <option value="">Choose an action...</option>
  {selectedService.status === "Completed" ? (
    <option value="reopen">Reopen Work Order</option>
  ) : (
    <>
      <option value="start">Start Work</option>
      <option value="complete">
        {selectedService.recurring
          ? "Complete & Move to Next Due"
          : "Mark Done"}
      </option>
      <option value="reschedule">Reschedule</option>
      <option value="tomorrow">Move to Tomorrow</option>
      <option value="next-week">Move to Next Week</option>
      <option value="convert">Convert Work Type</option>
    </>
  )}
  <option value="photo">Add Photo</option>
  <option value="duplicate">Duplicate Work Order</option>
  <option value="delete">Delete Work Order</option>
</select>
