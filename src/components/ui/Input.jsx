import { forwardRef, useId, useState } from 'react'
import { cn } from '../../utils'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(({
  className,
  type = 'text',
  label,
  id,
  error,
  helperText,
  leftIcon,
  rightIcon,
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [inputType, setInputType] = useState(type)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
    setInputType(showPassword ? 'password' : 'text')
  }

  const isPassword = type === 'password'
  const hasError = !!error
  const inputId = id || useId()

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'w-full px-4 py-3 border-2 rounded-lg transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'placeholder:text-gray-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon && 'pl-10',
            (rightIcon || isPassword) && 'pr-10',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-500',
            className
          )}
          disabled={disabled}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={togglePasswordVisibility}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}

        {rightIcon && !isPassword && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {helperText && !hasError && (
        <p className="text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
