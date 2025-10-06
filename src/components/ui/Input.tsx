import React from 'react'

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({className, ...props}, ref)=>{
  return <input ref={ref} className={`px-3 py-2 rounded-md bg-transparent border border-gray-700 ${className||''}`} {...props} />
})
Input.displayName='Input'

export function Label({children}:{children:React.ReactNode}){return <label className="text-sm block mb-1">{children}</label>}
