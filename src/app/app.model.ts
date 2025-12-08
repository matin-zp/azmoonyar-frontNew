 export  interface  postResponsModel{
    title:string,
    price:number,
    description:string,
    image:string,
    category:string

 }

 export interface todoItem{
   id:number
   task:string
   completed:boolean
   isediting ?: boolean

 }
 export interface examItam{
  id:number
  name:string
  finish:boolean
  date:date[]
  vote:number

  
 }
export interface date{
  y:number
  m:number
  d:number
}