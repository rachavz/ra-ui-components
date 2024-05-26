/*
 * File: ra-auto-complete.js
 * Author: Raúl H. Chávez V.
 * Date: 2024-05-25
 * Description: This JS file provides autocomplete functionality to enhance user interactivity and experience by suggesting options while typing in an input field.
 *
 * Licencia:
 * MIT License
 *
 * Copyright (c) 2024 Raúl H. Chávez V.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class RaAutoComplete extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        const container = document.createElement('div');
        container.classList.add('ra-auto-complete-container');

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.classList.add('ra-auto-complete-input');
        this.input.placeholder = this.getAttribute('placeholder') || 'Buscar...';
        this.input.setAttribute('autocomplete', 'off');


        this.list = document.createElement('div');
        this.list.classList.add('ra-auto-complete-list');

        container.appendChild(this.input);
        container.appendChild(this.list);
        this.shadowRoot.appendChild(container);

        this.currentItems = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.loading = false;

        this.input.addEventListener('input', () => this._onInput());
        this.list.addEventListener('scroll', () => this._onScroll());
        this.list.addEventListener('click', (e) => this._onItemClick(e));
        this.input.addEventListener('keydown', (e) => this._onKeyDown(e));

        const style = document.createElement('style');
        style.textContent = `@import url('/ra-auto-complete.css');`;
        this.shadowRoot.appendChild(style);

        document.addEventListener('click', (e) => this._handleClickOutside(e));
    }

    set onSearch(func) {
        this._search = func;
    }

    get onSearch() {
        return this._search;
    }

    set onValueChanged(func) {
        this._valueChanged = func;
    }

    get onValueChanged() {
        return this._valueChanged;
    }

    set itemTemplate(func) {
        this._ItemTemplate = func;
    }

    get itemTemplate() {
        return this._ItemTemplate;
    }

    setValue(id, value) {
        this.input.dataset.id = id;
        this.input.value = value;
    }

    getValue() {
        return { id: this.input.dataset.id, text: this.input.value };
    }

    clearValue() {
        this.input.dataset.id = '';
        this.input.value = '';
    }


    _handleClickOutside(event) {
        if (!this.contains(event.target)) {
            this.list.innerHTML = '';
        }
    }

    _onInput() {
        this.currentPage = 1;
        this.currentItems = [];
        this.list.innerHTML = '';
        this._fetchItems(this.input.value, this.currentPage);
    }

    _onScroll() {
        if (this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight) {
            if (!this.loading) {
                this._fetchItems(this.input.value, ++this.currentPage);
            }
        }
    }

    _onItemClick(e) {
        if (e.target.classList.contains('ra-auto-complete-item')) {
            this.input.dataset.id = e.target.dataset.id;
            this.input.value = e.target.textContent;
            this.list.innerHTML = '';

            if (this._valueChanged) {
                this._valueChanged(e.target.dataset.id, e.target.textContent);
            }
        }
    }

    _onKeyDown(e) {
        if (e.key === 'ArrowDown') {
            this._moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            this._moveSelection(-1);
        } else if (e.key === 'Escape') {
            this.list.innerHTML = '';
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const selected = this.list.querySelector('.ra-auto-complete-item.selected');
            if (selected) {
                this.input.dataset.id = e.target.dataset.id;
                this.input.value = e.target.textContent;
                this.list.innerHTML = '';

                if (this._valueChanged) {
                    this._valueChanged(e.target.dataset.id, e.target.textContent);
                }
            } else {
                this.list.innerHTML = '';
                if (e.key === 'Enter') {
                    this._onInput();
                }
            }
        }
    }

    _moveSelection(step) {
        const items = this.list.querySelectorAll('.ra-auto-complete-item');
        let index = Array.from(items).findIndex(item => item.classList.contains('selected'));
        index = Math.max(index + step, 0);
        index = Math.min(index, items.length - 1);
        items.forEach(item => item.classList.remove('selected'));
        items[index].classList.add('selected');
    }

    _fetchItems(query, page) {
        if (!this._search) return;
        this.loading = true;
        this._search(query, page, this.itemsPerPage)
            .then(items => {
                if (items && items.length > 0) {
                    this.currentItems = this.currentItems.concat(items);
                    this._renderItems(this.currentItems);
                }
                this.loading = false;
            })
            .catch(() => this.loading = false);
    }

    _renderItems(items) {
        if (this._ItemTemplate) {
            this.list.innerHTML = items.map(item => this._ItemTemplate(item)).join('');
        } else {
            this.list.innerHTML = items.map(item => `<div class="ra-auto-complete-item" data-id="${item.id}">${item.text}</div>`).join('');
        }
    }
}

customElements.define('ra-auto-complete', RaAutoComplete);
