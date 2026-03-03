function removeItem(list, index, confirmMessage, addDefaultFn) {
    const item = list[index];
    const isDirty = item.label || (item.length > 0) || (item.width > 0);

    if (!isDirty || confirm(confirmMessage)) {
        list.splice(index, 1);
        if (list.length === 0 && addDefaultFn) {
            addDefaultFn();
        }
    }
}


export { removeItem };