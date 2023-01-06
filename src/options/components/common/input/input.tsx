import React, { FC } from 'react';


const Input = ({onChange, classes, error, ...props}: any ) => {
    return <div className={`inline-block w-full ${classes || ''}`}>
    <input className={`drop-shadow-xl shadow-inner appearance-none bg-slate-700/50
                      rounded w-full p-3 text-white
                      leading-tight focus:outline-none focus:shadow-outline
                      ${error ? 'border border-red-500' : ''}`}
                      autoComplete="off"
                      onChange={onChange}
                      {...props} />
    {error ?  <p className="text-red-500 text-xs capitalize">{error.message}</p> : ''}
    </div>
}

export default Input;