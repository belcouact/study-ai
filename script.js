function initializeFormLayout() {
    const formContainer = document.getElementById('question-form-container');
    if (!formContainer) return;
    
    // Create a flex container for the dropdowns
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown-container';
    dropdownContainer.style.cssText = `
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 10px;
        margin: 10px 0;
        flex-wrap: nowrap;
    `;
    
    // Move all select elements into the dropdown container
    const selects = formContainer.querySelectorAll('select');
    selects.forEach(select => {
        const wrapper = document.createElement('div');
        wrapper.className = 'select-wrapper';
        wrapper.style.cssText = `
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        
        // Get the label for this select
        const label = formContainer.querySelector(`label[for="${select.id}"]`);
        if (label) {
            label.style.cssText = `
                font-size: 13px;
                color: #666;
                white-space: nowrap;
            `;
            wrapper.appendChild(label);
        }
        
        // Style the select element
        select.style.cssText = `
            width: 100%;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
        `;
        
        wrapper.appendChild(select);
        dropdownContainer.appendChild(wrapper);
    });
    
    // Insert the dropdown container at the start of the form
    const form = document.getElementById('question-form');
    if (form) {
        // Remove any existing dropdown container
        const existingContainer = form.querySelector('.dropdown-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Remove the "设置问题参数" heading if it exists
        const heading = form.querySelector('h3');
        if (heading && heading.textContent.includes('设置问题参数')) {
            heading.remove();
        }
        
        form.insertBefore(dropdownContainer, form.firstChild);
    }
}