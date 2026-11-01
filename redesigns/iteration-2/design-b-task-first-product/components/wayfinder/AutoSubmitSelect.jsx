'use client';
// A native <select> inside a GET form. With JavaScript it applies the filter
// immediately; without it, the form's submit button still works.
export default function AutoSubmitSelect(props) {
  return <select {...props} onChange={event => event.currentTarget.form?.requestSubmit()}/>;
}
