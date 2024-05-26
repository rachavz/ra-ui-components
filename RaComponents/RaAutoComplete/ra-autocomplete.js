/*
 * File: ra-autocomplete.js
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

class RaAutoComplete {
    constructor(element, options) {
        this._element = element;
        this._options = Object.assign({
            placeholder: 'Buscar...',
        }, options);

        this.currentItems = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.loading = false;

        this._element.classList.add('ra-autocomplete-container');

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.classList.add('ra-autocomplete-input');
        this.input.placeholder = this._options.placeholder;
        this.input.setAttribute('autocomplete', 'off');
        this.input.addEventListener('input', () => this._onInput());
        this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
        this._element.appendChild(this.input);

        this.list = document.createElement('div');
        this.list.classList.add('ra-autocomplete-list');
        this.list.addEventListener('scroll', () => this._onScroll());
        this.list.addEventListener('click', (e) => this._onItemClick(e));
        this._element.appendChild(this.list);        

        document.addEventListener('click', (e) => this._handleClickOutside(e));
    }

    set onFetchData(func) {
        this._onFechData = func;
    }

    set onValueChanged(func) {
        this._valueChanged = func;
    }
    set itemTemplate(func) {
        this._ItemTemplate = func;
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
        if (!this._element.contains(event.target)) {
            this.list.innerHTML = '';
        }
    }

    _onInput() {
        this.currentPage = 1;
        this.currentItems = [];
        this.list.innerHTML = '';
        this._fetchData(this.input.value, this.currentPage);
    }

    _onScroll() {
        if (this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight) {
            if (!this.loading) {
                this._fetchData(this.input.value, ++this.currentPage);
            }
        }
    }

    _onItemClick(e) {
        if (e.target.classList.contains('ra-autocomplete-item')) {
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
            const selected = this.list.querySelector('.ra-autocomplete-item-selected');
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
        const items = this.list.querySelectorAll('.ra-autocomplete-item');
        let index = Array.from(items).findIndex(item => item.classList.contains('ra-autocomplete-item-selected'));
        index = Math.max(index + step, 0);
        index = Math.min(index, items.length - 1);
        items.forEach(item => item.classList.remove('ra-autocomplete-item-selected'));
        items[index].classList.add('ra-autocomplete-item-selected');
    }

    _fetchData(query, page) {
        if (!this._onFechData) return;
        this.loading = true;
        this._onFechData(query, page, this.itemsPerPage)
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
            this.list.innerHTML = items.map(item => `<div class="ra-autocomplete-item" data-id="${item.id}">${item.text}</div>`).join('');
        }
    }
}
