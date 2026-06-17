'use strict';

/* ── file upload with drag & drop ── */
const fileInput   = document.getElementById('reference');
const previewWrap = document.getElementById('filePreviews');
const uploadArea  = document.getElementById('uploadArea');

if (fileInput && previewWrap && uploadArea) {
  let files = [];

  const addFiles = (newFiles) => {
    Array.from(newFiles).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;

      files.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'form__preview-item';
        item.setAttribute('role', 'listitem');

        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'form__preview-remove';
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
          files = files.filter(f => f !== file);
          item.remove();
        });

        item.appendChild(img);
        item.appendChild(removeBtn);
        previewWrap.appendChild(item);
      };
      reader.readAsDataURL(file);
    });
  };

  fileInput.addEventListener('change', (e) => addFiles(e.target.files));

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', (e) => {
    if (!uploadArea.contains(e.relatedTarget)) {
      uploadArea.classList.remove('drag-over');
    }
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });

  uploadArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
}

/* ── contact form validation & submit ── */
const contactForm = document.getElementById('contactForm');
const submitBtn   = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const previewWrapRef = document.getElementById('filePreviews');

if (contactForm) {
  const validateField = (input) => {
    const errorEl = input.closest('.form__group')?.querySelector('.form__error');
    let msg = '';

    if (input.required && !input.value.trim()) {
      msg = 'This field is required.';
    } else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      msg = 'Please enter a valid email address.';
    }

    if (errorEl) errorEl.textContent = msg;
    input.classList.toggle('invalid', !!msg);
    return !msg;
  };

  contactForm.querySelectorAll('input[required], input[type="email"]').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) validateField(input);
    });
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    contactForm.querySelectorAll('input[required]').forEach(input => {
      if (!validateField(input)) valid = false;
    });
    const emailInput = contactForm.querySelector('input[type="email"]');
    if (emailInput && !validateField(emailInput)) valid = false;

    if (!valid) {
      const firstInvalid = contactForm.querySelector('.invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.style.display = 'none';
      formSuccess.hidden = false;
      contactForm.reset();
      if (previewWrapRef) previewWrapRef.innerHTML = '';

      setTimeout(() => {
        submitBtn.style.display = '';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        formSuccess.hidden = true;
      }, 6000);
    }, 1400);
  });
}
